import pandas as pd
import datetime
import os
from sqlalchemy import create_engine
from dotenv import load_dotenv
import sys
sys.path.append(os.path.dirname(__file__))
from predict_tomorrow import predict_tomorrow

def save_forecast_to_db():
    # 1. Determine dates (Next 7 days from today)
    today = datetime.date.today()
    start_date = today + datetime.timedelta(days=1)
    end_date = today + datetime.timedelta(days=7)
    
    print(f"Generating 7-day forecast from {start_date} to {end_date}...")
    
    # 2. Call the prediction function
    predictions = predict_tomorrow(start_date=start_date, end_date=end_date)
    
    if "error" in predictions:
        print(f"Error generating predictions: {predictions['error']}")
        return
    
    # 3. Parse JSON-like results into a list of dictionaries for DataFrame
    records = []
    for day_result in predictions.get("results", []):
        date_str = day_result["date"]
        for slot in day_result["slots"]:
            records.append({
                "date": date_str,
                "tod_slot": slot["tod"],
                "season": slot["season"],
                "predicted_winning_market": slot["prediction"],
                "estimated_savings": slot["savings"],
                "predicted_dam_price": slot["dam_mean"],
                "predicted_rtm_price": slot["rtm_mean"],
                "predicted_gdam_price": slot["gdam_mean"]
            })
            
    df_forecast = pd.DataFrame(records)
    
    if df_forecast.empty:
        print("No predictions generated.")
        return
        
    print(f"Successfully generated {len(df_forecast)} forecast records.")
    
    # 4. Save to Database using centralized get_db_engine (from .env DATABASE_URL)
    schema = 'forecasting'
    table_name = 'market_forecasting'
    
    try:
        from data_pipeline import get_db_engine
        engine = get_db_engine()
        
        # Ensure schema exists
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema}"))
            if hasattr(conn, 'commit'):
                conn.commit()
            
        # Overwrite table with new forecast
        df_forecast.to_sql(table_name, engine, schema=schema, if_exists='replace', index=False)
        print(f"Successfully saved forecast to database in {schema}.{table_name}!")
    except Exception as e:
        print(f"Failed to save to database: {e}")

if __name__ == "__main__":
    save_forecast_to_db()

