import pandas as pd
import numpy as np
import os
import datetime
from dotenv import load_dotenv
from sqlalchemy import create_engine

def assign_tod_and_season(df: pd.DataFrame) -> pd.DataFrame:
    """
    Assigns Season and TOD slot based on the 15-min time block and date.
    Assumes df has 'date' (datetime) and 'time_block' (string, e.g., '00:00-00:15') columns.
    """
    df = df.copy()
    df['date'] = pd.to_datetime(df['date'])
    df['month'] = df['date'].dt.month
    
    # Extract start hour from time_block (e.g. '05:00-05:15' -> 5)
    # Assuming time_block format is 'HH:MM-HH:MM'
    df['start_time'] = pd.to_datetime(df['time_block'].str.split('-').str[0], format='%H:%M').dt.time
    df['start_hour'] = df['start_time'].apply(lambda x: x.hour)
    
    # Determine Season
    # Summer (Apr 1 - Sep 30) -> months 4 to 9
    # Winter (Oct 1 - Mar 31) -> months 10, 11, 12, 1, 2, 3
    df['season'] = np.where(df['month'].isin([4, 5, 6, 7, 8, 9]), 'Summer', 'Winter')
    
    # Determine TOD based on Season and start_hour
    conditions = [
        # Summer Conditions
        (df['season'] == 'Summer') & (df['start_hour'] >= 5) & (df['start_hour'] < 10),
        (df['season'] == 'Summer') & (df['start_hour'] >= 10) & (df['start_hour'] < 19),
        (df['season'] == 'Summer') & ((df['start_hour'] >= 19) | (df['start_hour'] < 3)), # 19:00 to 03:00
        (df['season'] == 'Summer') & (df['start_hour'] >= 3) & (df['start_hour'] < 5),
        
        # Winter Conditions
        (df['season'] == 'Winter') & (df['start_hour'] >= 5) & (df['start_hour'] < 11),
        (df['season'] == 'Winter') & (df['start_hour'] >= 11) & (df['start_hour'] < 17),
        (df['season'] == 'Winter') & (df['start_hour'] >= 17) & (df['start_hour'] < 23),
        (df['season'] == 'Winter') & ((df['start_hour'] >= 23) | (df['start_hour'] < 5))  # 23:00 to 05:00
    ]
    
    choices = [
        'TOD-1', 'TOD-2', 'TOD-3', 'TOD-4', # Summer TODs
        'TOD-1', 'TOD-2', 'TOD-3', 'TOD-4'  # Winter TODs
    ]
    
    df['tod_slot'] = np.select(conditions, choices, default='Unknown')
    
    # Handle overnight wrap-around dates for TOD crossing midnight.
    # If a block is past midnight (e.g. 00:00 to 03:00 in Summer TOD-3), 
    # it belongs to the *previous* day's trading day.
    
    # Summer TOD-3 crosses midnight (19:00 to 03:00). Blocks < 03:00 belong to previous day.
    summer_wrap = (df['season'] == 'Summer') & (df['tod_slot'] == 'TOD-3') & (df['start_hour'] < 3)
    
    # Winter TOD-4 crosses midnight (23:00 to 05:00). Blocks < 05:00 belong to previous day.
    winter_wrap = (df['season'] == 'Winter') & (df['tod_slot'] == 'TOD-4') & (df['start_hour'] < 5)
    
    df.loc[summer_wrap | winter_wrap, 'date'] = df.loc[summer_wrap | winter_wrap, 'date'] - pd.Timedelta(days=1)

    return df

def aggregate_and_engineer_features(df_merged: pd.DataFrame) -> pd.DataFrame:
    """
    df_merged: DataFrame with aligned 15-min data from DAM, RTM, GDAM.
    Expected columns: 'date', 'time_block', 'dam_price', 'rtm_price', 'gdam_price'
    """
    
    # 1. Assign TOD and handle overnight wrap-arounds
    df_with_tod = assign_tod_and_season(df_merged)
    
    # 2. Aggregate to TOD level
    # We take the mean of the 15-min prices within each TOD slot for each date
    agg_df = df_with_tod.groupby(['date', 'season', 'tod_slot']).agg(
        dam_price=('dam_price', 'mean'),
        rtm_price=('rtm_price', 'mean'),
        gdam_price=('gdam_price', 'mean')
    ).reset_index()
    
    # Sort by date and TOD to ensure rolling works correctly
    agg_df = agg_df.sort_values(by=['date', 'tod_slot']).reset_index(drop=True)
    
    # 3. Determine Target: Winning Market (Assuming lowest price is best, adjust if highest is best)
    # Using np.argmin to find the index of the minimum price
    prices = agg_df[['dam_price', 'rtm_price', 'gdam_price']].values
    market_names = ['DAM', 'RTM', 'GDAM']
    agg_df['winning_market'] = [market_names[i] for i in np.argmin(prices, axis=1)]
    
    # 4. Feature Engineering: Rolling 7-day windows PER TOD SLOT
    # We group by tod_slot so rolling windows only look at past days for the SAME tod slot.
    
    features = []
    
    for tod, group in agg_df.groupby('tod_slot'):
        group = group.copy().sort_values('date')
        group.set_index('date', inplace=True)
        
        # Spreads
        group['spread_dam_rtm'] = group['dam_price'] - group['rtm_price']
        group['spread_dam_gdam'] = group['dam_price'] - group['gdam_price']
        group['spread_rtm_gdam'] = group['rtm_price'] - group['gdam_price']
        
        # Rolling means and std (last 7 days, excluding current day to prevent data leakage -> use shift(1))
        # Note: group is already daily per TOD, so rolling(7) is 7 days.
        for col in ['dam_price', 'rtm_price', 'gdam_price']:
            group[f'{col}_lag1'] = group[col].shift(1)
            group[f'{col}_roll7_mean'] = group[col].shift(1).rolling(window=7, min_periods=1).mean()
            group[f'{col}_roll7_std'] = group[col].shift(1).rolling(window=7, min_periods=1).std()
            
            # 3-day trend (Current day's previous 3 days diff)
            # Trend = price at (T-1) - price at (T-3)
            group[f'{col}_3d_trend'] = group[col].shift(1) - group[col].shift(3)
            
        # Rolling mean spreads
        for col in ['spread_dam_rtm', 'spread_dam_gdam', 'spread_rtm_gdam']:
            group[f'{col}_roll7_mean'] = group[col].shift(1).rolling(window=7, min_periods=1).mean()
            
        # Rolling win count for each market in the last 7 days
        # Shift(1) to avoid leakage
        group['dam_won'] = (group['winning_market'] == 'DAM').astype(int)
        group['rtm_won'] = (group['winning_market'] == 'RTM').astype(int)
        group['gdam_won'] = (group['winning_market'] == 'GDAM').astype(int)
        
        group['dam_roll7_wins'] = group['dam_won'].shift(1).rolling(window=7, min_periods=1).sum()
        group['rtm_roll7_wins'] = group['rtm_won'].shift(1).rolling(window=7, min_periods=1).sum()
        group['gdam_roll7_wins'] = group['gdam_won'].shift(1).rolling(window=7, min_periods=1).sum()
        
        group.drop(columns=['dam_won', 'rtm_won', 'gdam_won'], inplace=True)
        
        features.append(group.reset_index())
        
    final_df = pd.concat(features).sort_values(['date', 'tod_slot']).reset_index(drop=True)
    
    # Categorical features
    final_df['day_of_week'] = final_df['date'].dt.dayofweek
    final_df['is_weekend'] = final_df['day_of_week'].isin([5, 6]).astype(int)
    
    # Drop rows with NaN (due to rolling windows / shifts at the beginning of the dataset)
    # final_df.dropna(inplace=True) # Optional: You can drop NAs or let LightGBM handle them.
    
    return final_df

from sqlalchemy import create_engine, text

def get_db_engine(read_only=False):
    from urllib.parse import urlparse, urlunparse
    # Search for .env
    for env_path in [
        os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '.env')),
        os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '.env')),
        os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env')),
    ]:
        if os.path.exists(env_path):
            load_dotenv(env_path)
            break

    db_url = os.getenv('DATABASE_URL') or os.getenv('PROD_DATABASE_URL')
    if db_url:
        parsed = urlparse(db_url)
        # Strip query parameters (like ?schema=public) that cause psycopg2 invalid option errors
        connection_string = urlunparse(('postgresql+psycopg2', parsed.netloc, parsed.path, '', '', ''))
    else:
        host = os.getenv('PROD_PGHOST') or os.getenv('PGHOST') or 'localhost'
        port = os.getenv('PROD_PGPORT') or os.getenv('PGPORT') or '5432'
        database = os.getenv('PROD_PGDATABASE') or os.getenv('PGDATABASE') or 'Prolt_Operations'
        user = os.getenv('PROD_PGUSER') or os.getenv('PGUSER') or 'postgres'
        password = os.getenv('PROD_PGPASSWORD') or os.getenv('PGPASSWORD') or ''
        connection_string = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{database}"

    return create_engine(connection_string)

def fetch_market_data(days=395, target_date=None) -> pd.DataFrame:
    """
    Fetches DAM, RTM, and GDAM market prices from the production PostgreSQL database
    for the last 'days' days. Strictly excludes the target_date to prevent data leakage.
    """
    engine = get_db_engine(read_only=True)
    
    # Calculate end date strictly before target_date if provided
    if target_date is not None:
        if isinstance(target_date, str):
            target_date = pd.to_datetime(target_date).date()
        end_date = target_date - datetime.timedelta(days=1)
    else:
        end_date = datetime.date.today()
        
    start_date = end_date - datetime.timedelta(days=days)
    
    date_parse_expr = "CASE WHEN date LIKE '____-__-__' THEN TO_DATE(date, 'YYYY-MM-DD') ELSE TO_DATE(date, 'DD-MM-YYYY') END"
    
    # Fetch DAM
    query_dam = f"""
        SELECT {date_parse_expr} as date, "intervalTime" as time_block, mcp as dam_price
        FROM public."DamRecord"
        WHERE {date_parse_expr} >= '{start_date}' AND {date_parse_expr} <= '{end_date}'
    """
    # Fetch RTM
    query_rtm = f"""
        SELECT {date_parse_expr} as date, "intervalTime" as time_block, mcp as rtm_price
        FROM public."RtmRecord"
        WHERE {date_parse_expr} >= '{start_date}' AND {date_parse_expr} <= '{end_date}'
    """
    # Fetch GDAM from both tables (GdamRecord handles < 2026-07-13, GdamNewRecord handles >= 2026-07-13)
    query_gdam = f"""
        SELECT {date_parse_expr} as date, "intervalTime" as time_block, mcp as gdam_price
        FROM public."GdamRecord"
        WHERE {date_parse_expr} >= '{start_date}' AND {date_parse_expr} <= '{end_date}'
        UNION ALL
        SELECT {date_parse_expr} as date, "intervalTime" as time_block, mcp as gdam_price
        FROM public."GdamNewRecord"
        WHERE {date_parse_expr} >= '{start_date}' AND {date_parse_expr} <= '{end_date}'
    """

    with engine.connect() as conn:
        df_dam = pd.read_sql(text(query_dam), conn)
        df_rtm = pd.read_sql(text(query_rtm), conn)
        df_gdam = pd.read_sql(text(query_gdam), conn)

    df_dam.drop_duplicates(subset=['date', 'time_block'], keep='last', inplace=True)
    df_rtm.drop_duplicates(subset=['date', 'time_block'], keep='last', inplace=True)
    df_gdam.drop_duplicates(subset=['date', 'time_block'], keep='last', inplace=True)
    
    # Merge them together using pandas (Outer Join)
    df = pd.merge(df_dam, df_rtm, on=['date', 'time_block'], how='outer')
    df = pd.merge(df, df_gdam, on=['date', 'time_block'], how='outer')
    
    # Sort just like the original SQL
    df.sort_values(['date', 'time_block'], inplace=True)
    df.reset_index(drop=True, inplace=True)
    
    # Clean the time_block in case it has spaces (e.g., '00:00 - 00:15' -> '00:00-00:15')
    if not df.empty:
        df['time_block'] = df['time_block'].str.replace(' ', '')
    
    # Ensure numeric columns
    df['dam_price'] = pd.to_numeric(df['dam_price'])
    df['rtm_price'] = pd.to_numeric(df['rtm_price'])
    df['gdam_price'] = pd.to_numeric(df['gdam_price'])
    
    return df

def save_to_db(df: pd.DataFrame, table_name: str, schema: str):
    """Saves the dataframe to the specified PostgreSQL schema and table."""
    engine = get_db_engine(read_only=False)
    
    print(f"Saving data to {schema}.{table_name}...")
    df.to_sql(table_name, engine, schema=schema, if_exists='replace', index=False)
    print("Data saved successfully.")

if __name__ == "__main__":
    # Fetch real data from DB
    df_market = fetch_market_data(days=730)
    
    print(f"Fetched {len(df_market)} 15-min intervals.")
    print(df_market.head())
    
    print("\nEngineering features...")
    processed_df = aggregate_and_engineer_features(df_market)
    print("Sample TOD Aggregated & Engineered Features:")
    print(processed_df.head(10))
    
    # Save processed data to the forecasting schema
    save_to_db(processed_df, table_name='market_analysis', schema='forecasting')

