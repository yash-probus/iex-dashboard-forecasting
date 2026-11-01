import pandas as pd
import os
import numpy as np
import lightgbm as lgb
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error
import json
import datetime


def compute_market_accuracy(y_true_dam, y_true_rtm, y_true_gdam,
                            y_pred_dam, y_pred_rtm, y_pred_gdam):
    """
    Computes the % of rows where the model correctly identifies
    the cheapest market (the actual task we care about).
    """
    true_prices = np.column_stack([y_true_dam, y_true_rtm, y_true_gdam])
    pred_prices = np.column_stack([y_pred_dam, y_pred_rtm, y_pred_gdam])

    true_best = np.argmin(true_prices, axis=1)
    pred_best = np.argmin(pred_prices, axis=1)

    accuracy = np.mean(true_best == pred_best) * 100
    return accuracy


def train_and_evaluate(df: pd.DataFrame):
    """
    Trains three LightGBM regression models to predict DAM, RTM, and GDAM prices.
    Uses TimeSeriesSplit cross-validation with early stopping for robust evaluation.
    
    df: DataFrame containing the engineered features and price targets.
    """
    
    # Ensure data is sorted chronologically
    df = df.sort_values(by=['date', 'tod_slot']).reset_index(drop=True)
    
    # Exclude non-feature columns
    exclude_cols = [
        'date', 'time_block', 'season', 'tod_slot', 'winning_market', 
        'dam_price', 'rtm_price', 'gdam_price',
        'spread_dam_rtm', 'spread_dam_gdam', 'spread_rtm_gdam'
    ]
    feature_cols = [col for col in df.columns if col not in exclude_cols]
    
    feature_cols.extend(['season', 'tod_slot'])
    
    # Map categorical features to integers
    season_map = {'Summer': 0, 'Winter': 1}
    tod_map = {'TOD-1': 0, 'TOD-2': 1, 'TOD-3': 2, 'TOD-4': 3}
    
    df_model = df.copy()
    df_model['season'] = df_model['season'].map(season_map)
    df_model['tod_slot'] = df_model['tod_slot'].map(tod_map)
    
    X = df_model[feature_cols]
    
    # Targets for the 3 regressors
    targets = {
        'DAM': df_model['dam_price'],
        'RTM': df_model['rtm_price'],
        'GDAM': df_model['gdam_price']
    }
    
    # Tuned LightGBM Parameters
    lgb_params = {
        'objective': 'regression',
        'metric': 'rmse',
        'boosting_type': 'gbdt',
        'learning_rate': 0.03,
        'num_leaves': 63,
        'max_depth': 8,
        'min_child_samples': 20,
        'subsample': 0.8,
        'colsample_bytree': 0.8,
        'reg_alpha': 0.1,
        'reg_lambda': 0.1,
        'random_state': 42,
        'verbose': -1
    }
    
    categorical_features = ['season', 'tod_slot', 'day_of_week']
    
    # ── Cross-Validation Phase ──
    print("\n" + "=" * 60)
    print("  CROSS-VALIDATION (5-Fold TimeSeriesSplit)")
    print("=" * 60)
    
    tscv = TimeSeriesSplit(n_splits=5)
    
    cv_results = {market: {'rmse': [], 'mae': []} for market in targets}
    cv_market_accuracy = []
    
    for fold, (train_idx, val_idx) in enumerate(tscv.split(X)):
        X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
        
        fold_preds = {}
        fold_actuals = {}
        
        for market, y in targets.items():
            y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]
            
            train_data = lgb.Dataset(X_train, label=y_train,
                                     categorical_feature=categorical_features)
            val_data = lgb.Dataset(X_val, label=y_val,
                                  categorical_feature=categorical_features,
                                  reference=train_data)
            
            callbacks = [
                lgb.early_stopping(stopping_rounds=50, verbose=False),
                lgb.log_evaluation(period=0)  # Suppress per-round logs
            ]
            
            model = lgb.train(
                lgb_params,
                train_data,
                num_boost_round=500,
                valid_sets=[val_data],
                callbacks=callbacks
            )
            
            y_pred = model.predict(X_val)
            
            rmse = np.sqrt(mean_squared_error(y_val, y_pred))
            mae = mean_absolute_error(y_val, y_pred)
            
            cv_results[market]['rmse'].append(rmse)
            cv_results[market]['mae'].append(mae)
            
            fold_preds[market] = y_pred
            fold_actuals[market] = y_val.values
        
        # Market recommendation accuracy for this fold
        fold_accuracy = compute_market_accuracy(
            fold_actuals['DAM'], fold_actuals['RTM'], fold_actuals['GDAM'],
            fold_preds['DAM'], fold_preds['RTM'], fold_preds['GDAM']
        )
        cv_market_accuracy.append(fold_accuracy)
        
        print(f"\nFold {fold + 1}:")
        for market in targets:
            print(f"  {market} — RMSE: {cv_results[market]['rmse'][-1]:.2f}, "
                  f"MAE: {cv_results[market]['mae'][-1]:.2f}")
        print(f"  Market Recommendation Accuracy: {fold_accuracy:.1f}%")
    
    # Print CV Summary
    print("\n" + "-" * 60)
    print("  CV Summary (Mean ± Std across 5 folds)")
    print("-" * 60)
    for market in targets:
        rmse_arr = np.array(cv_results[market]['rmse'])
        mae_arr = np.array(cv_results[market]['mae'])
        print(f"  {market} — RMSE: {rmse_arr.mean():.2f} ± {rmse_arr.std():.2f}, "
              f"MAE: {mae_arr.mean():.2f} ± {mae_arr.std():.2f}")
    
    acc_arr = np.array(cv_market_accuracy)
    print(f"\n  Market Recommendation Accuracy: {acc_arr.mean():.1f}% ± {acc_arr.std():.1f}%")
    print("-" * 60)

    # ── Final Training on Full Dataset ──
    print("\n" + "=" * 60)
    print("  FINAL TRAINING (Full Dataset with Early Stopping)")
    print("=" * 60)
    
    models = {}
    
    # Use last 20% as validation for early stopping on the final model
    split_idx = int(len(X) * 0.8)
    X_train_final, X_val_final = X.iloc[:split_idx], X.iloc[split_idx:]
    
    for market, y in targets.items():
        y_train_final = y.iloc[:split_idx]
        y_val_final = y.iloc[split_idx:]
        
        train_data = lgb.Dataset(X_train_final, label=y_train_final,
                                 categorical_feature=categorical_features)
        val_data = lgb.Dataset(X_val_final, label=y_val_final,
                               categorical_feature=categorical_features,
                               reference=train_data)
        
        callbacks = [
            lgb.early_stopping(stopping_rounds=50, verbose=True),
            lgb.log_evaluation(period=50)
        ]
        
        model = lgb.train(
            lgb_params,
            train_data,
            num_boost_round=500,
            valid_sets=[val_data],
            callbacks=callbacks
        )
        
        filename = os.path.join(os.path.dirname(__file__), '..', 'models', f'lightgbm_model_{market.lower()}.txt')
        model.save_model(filename)
        models[market] = model
        print(f"  {market} model saved to '{filename}' "
              f"(best iteration: {model.best_iteration})")
        
        # Feature importance
        importance = model.feature_importance(importance_type='gain')
        feat_imp = sorted(zip(feature_cols, importance),
                          key=lambda x: x[1], reverse=True)
        print(f"  Top 5 features for {market}:")
        for feat_name, feat_val in feat_imp[:5]:
            print(f"    - {feat_name}: {feat_val:.1f}")
    
    return models, feature_cols


if __name__ == "__main__":
    import os
    from dotenv import load_dotenv
    from sqlalchemy import create_engine
    
    load_dotenv()
    host = os.getenv('PGHOST')
    port = os.getenv('PGPORT')
    database = os.getenv('PGDATABASE')
    user = os.getenv('PGUSER')
    password = os.getenv('PGPASSWORD')
    
    connection_string = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{database}"
    engine = create_engine(connection_string)
    
    print("Fetching processed features from database...")
    processed_df = pd.read_sql("SELECT * FROM forecasting.market_analysis", engine)
    
    # Drop NAs that come from rolling windows
    processed_df.dropna(inplace=True)
    
    two_years_ago = pd.to_datetime(datetime.date.today() - datetime.timedelta(days=365*2))
    processed_df['date'] = pd.to_datetime(processed_df['date'])
    processed_df = processed_df[processed_df['date'] >= two_years_ago].copy()
    
    print(f"Training model on {len(processed_df)} records from {two_years_ago.date()} onwards...")
    model, features = train_and_evaluate(processed_df)
    
    # Save features list
    feature_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'model_features.json')
    with open(feature_path, 'w') as f:
        json.dump(features, f)
    print(f"\nFeature list saved to '{feature_path}'")

