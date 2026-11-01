import pandas as pd
import os
import numpy as np
import lightgbm as lgb
import json
import datetime
import logging
import sys
sys.path.append(os.path.dirname(__file__))
from data_pipeline import fetch_market_data, aggregate_and_engineer_features

logger = logging.getLogger(__name__)


def predict_tomorrow(start_date=None, end_date=None):
    if start_date is None:
        start_date = datetime.date.today() + datetime.timedelta(days=1)
    elif isinstance(start_date, str):
        start_date = pd.to_datetime(start_date).date()
        
    if end_date is None:
        end_date = start_date
    elif isinstance(end_date, str):
        end_date = pd.to_datetime(end_date).date()

    if end_date < start_date:
        return {"error": "end_date cannot be before start_date"}
        
    today = datetime.date.today()
    if (end_date - today).days > 7:
        return {"error": "Forecast is strictly limited to a maximum of 7 days into the future to maintain accuracy."}

    # Fetch enough history to cover the entire range
    total_days = 15 + (end_date - start_date).days
    df_all_history = fetch_market_data(days=total_days, target_date=end_date)
    
    if df_all_history.empty:
        return {"error": "No recent data available. Cannot predict."}

    df_all_history['date'] = pd.to_datetime(df_all_history['date'])

    has_lgb_models = False
    model_dam = None
    model_rtm = None
    model_gdam = None
    feature_cols = []

    try:
        model_dir = os.path.join(os.path.dirname(__file__), '..', 'models')
        feat_path = os.path.join(model_dir, 'model_features.json')
        if os.path.exists(feat_path):
            with open(feat_path, 'r') as f:
                feature_cols = json.load(f)
            dam_file = os.path.join(model_dir, 'lightgbm_model_dam.txt')
            rtm_file = os.path.join(model_dir, 'lightgbm_model_rtm.txt')
            gdam_file = os.path.join(model_dir, 'lightgbm_model_gdam.txt')
            if os.path.exists(dam_file) and os.path.exists(rtm_file) and os.path.exists(gdam_file):
                model_dam = lgb.Booster(model_file=dam_file)
                model_rtm = lgb.Booster(model_file=rtm_file)
                model_gdam = lgb.Booster(model_file=gdam_file)
                has_lgb_models = True
    except Exception as e:
        logger.warning(f"Could not load LightGBM models ({e}), falling back to 7-day rolling mean.")
        has_lgb_models = False

    results_list = []
    
    current_date = start_date
    while current_date <= end_date:
        df_recent = df_all_history[df_all_history['date'].dt.date < current_date].copy()
        
        times = pd.date_range(f"{current_date} 00:00", f"{current_date} 23:45", freq='15min')
        dummy_data = {
            'date': [current_date] * len(times),
            'time_block': [f"{t.strftime('%H:%M')}-{(t + datetime.timedelta(minutes=15)).strftime('%H:%M')}" for t in times],
            'dam_price': [0.0] * len(times),
            'rtm_price': [0.0] * len(times),
            'gdam_price': [0.0] * len(times)
        }
        df_dummy = pd.DataFrame(dummy_data)
        df_dummy['date'] = pd.to_datetime(df_dummy['date'])
        
        df_combined = pd.concat([df_recent, df_dummy], ignore_index=True)
        
        processed_df = aggregate_and_engineer_features(df_combined)
        df_target = processed_df[processed_df['date'].dt.date == current_date].copy()
        
        if df_target.empty:
            current_date += datetime.timedelta(days=1)
            continue
            
        season_map = {'Summer': 0, 'Winter': 1}
        tod_map = {'TOD-1': 0, 'TOD-2': 1, 'TOD-3': 2, 'TOD-4': 3}
        
        df_model = df_target.copy()
        df_model['season'] = df_model['season'].map(season_map)
        df_model['tod_slot_encoded'] = df_model['tod_slot'].map(tod_map)
        df_model['tod_slot'] = df_model['tod_slot_encoded']
        
        if has_lgb_models and model_dam and model_rtm and model_gdam:
            X_target = df_model[feature_cols]
            preds_dam = model_dam.predict(X_target)
            preds_rtm = model_rtm.predict(X_target)
            preds_gdam = model_gdam.predict(X_target)
            
            predicted_markets = []
            predicted_savings = []
            
            for i in range(len(preds_dam)):
                p_dam = preds_dam[i]
                p_rtm = preds_rtm[i]
                p_gdam = preds_gdam[i]
                
                prices = {'DAM': p_dam, 'RTM': p_rtm, 'GDAM': p_gdam}
                sorted_prices = sorted(prices.items(), key=lambda x: x[1])
                
                best_market = sorted_prices[0][0]
                best_price = sorted_prices[0][1]
                second_best_price = sorted_prices[1][1]
                
                savings = second_best_price - best_price
                
                predicted_markets.append(best_market)
                predicted_savings.append(float(savings))
        else:
            predicted_markets = []
            predicted_savings = []
            for _, r in df_target.iterrows():
                dam_roll = r.get('dam_price_roll7_mean', 0.0)
                rtm_roll = r.get('rtm_price_roll7_mean', 0.0)
                gdam_roll = r.get('gdam_price_roll7_mean', 0.0)
                prices = {'DAM': float(dam_roll or 0.0), 'RTM': float(rtm_roll or 0.0), 'GDAM': float(gdam_roll or 0.0)}
                sorted_prices = sorted(prices.items(), key=lambda x: x[1])
                best_market = sorted_prices[0][0]
                best_price = sorted_prices[0][1]
                second_best_price = sorted_prices[1][1] if len(sorted_prices) > 1 else best_price
                savings = second_best_price - best_price
                predicted_markets.append(best_market)
                predicted_savings.append(float(savings))
        
        max_real_date = df_recent['date'].dt.date.max()
        
        day_result = {
            "date": str(current_date),
            "slots": []
        }
        
        for i, row in df_target.iterrows():
            tod_name = row['tod_slot']
            season_name = row['season']
            pred_market = predicted_markets[i - df_target.index[0]]
            savings = predicted_savings[i - df_target.index[0]]
            
            dam_roll_mean = row.get('dam_price_roll7_mean', 0.0)
            rtm_roll_mean = row.get('rtm_price_roll7_mean', 0.0)
            gdam_roll_mean = row.get('gdam_price_roll7_mean', 0.0)
            
            hist_df = processed_df[(processed_df['tod_slot'] == tod_name) & (processed_df['date'].dt.date <= max_real_date)].sort_values('date', ascending=False).head(7)
            history_list = []
            for _, h_row in hist_df.iterrows():
                dam_p = h_row.get('dam_price', np.nan)
                rtm_p = h_row.get('rtm_price', np.nan)
                gdam_p = h_row.get('gdam_price', np.nan)
                
                def null_or_zero(val): return float(val) if not pd.isna(val) else None
                
                history_list.append({
                    "date": str(h_row['date'].date()),
                    "dam": null_or_zero(dam_p),
                    "rtm": null_or_zero(rtm_p),
                    "gdam": null_or_zero(gdam_p)
                })
                
            slot_data = {
                "tod": tod_name,
                "season": season_name,
                "prediction": pred_market,
                "savings": savings,
                "history": history_list,
                "dam_mean": float(dam_roll_mean) if not pd.isna(dam_roll_mean) else 0.0,
                "rtm_mean": float(rtm_roll_mean) if not pd.isna(rtm_roll_mean) else 0.0,
                "gdam_mean": float(gdam_roll_mean) if not pd.isna(gdam_roll_mean) else 0.0,
                "ensemble_method": "lightgbm_only"
            }
            
            day_result["slots"].append(slot_data)
            
        daily_rtc = df_recent.groupby(df_recent['date'].dt.date).agg(
            dam_price=('dam_price', 'mean'),
            rtm_price=('rtm_price', 'mean'),
            gdam_price=('gdam_price', 'mean')
        ).reset_index()
        daily_rtc.rename(columns={'date': 'date_dt'}, inplace=True)
        
        daily_rtc_last7 = daily_rtc[daily_rtc['date_dt'] <= max_real_date].sort_values('date_dt', ascending=False).head(7)
        
        rtc_history_list = []
        for _, h_row in daily_rtc_last7.iterrows():
            dam_p = h_row.get('dam_price', np.nan)
            rtm_p = h_row.get('rtm_price', np.nan)
            gdam_p = h_row.get('gdam_price', np.nan)
            
            rtc_history_list.append({
                "date": str(h_row['date_dt']),
                "dam": float(dam_p) if not pd.isna(dam_p) else None,
                "rtm": float(rtm_p) if not pd.isna(rtm_p) else None,
                "gdam": float(gdam_p) if not pd.isna(gdam_p) else None
            })
            
        rtc_dam_mean = daily_rtc_last7['dam_price'].mean()
        rtc_rtm_mean = daily_rtc_last7['rtm_price'].mean()
        rtc_gdam_mean = daily_rtc_last7['gdam_price'].mean()
        
        rtc_means = {'DAM': rtc_dam_mean, 'RTM': rtc_rtm_mean, 'GDAM': rtc_gdam_mean}
        valid_rtc_means = {k: v for k, v in rtc_means.items() if not pd.isna(v)}
        
        if valid_rtc_means:
            sorted_rtc = sorted(valid_rtc_means.items(), key=lambda x: x[1])
            rtc_best_market = sorted_rtc[0][0]
            rtc_savings = sorted_rtc[1][1] - sorted_rtc[0][1] if len(sorted_rtc) > 1 else 0.0
        else:
            rtc_best_market = "N/A"
            rtc_savings = 0.0
            
        day_result["slots"].append({
            "tod": "RTC",
            "season": df_target['season'].iloc[0] if not df_target.empty else "Unknown",
            "prediction": rtc_best_market,
            "savings": float(rtc_savings),
            "history": rtc_history_list,
            "dam_mean": float(rtc_dam_mean) if not pd.isna(rtc_dam_mean) else 0.0,
            "rtm_mean": float(rtc_rtm_mean) if not pd.isna(rtc_rtm_mean) else 0.0,
            "gdam_mean": float(rtc_gdam_mean) if not pd.isna(rtc_gdam_mean) else 0.0,
            "ensemble_method": "7day_mean"
        })

        results_list.append(day_result)
        current_date += datetime.timedelta(days=1)
        
    return {"results": results_list}
        
if __name__ == "__main__":
    import pprint
    pprint.pprint(predict_tomorrow())

