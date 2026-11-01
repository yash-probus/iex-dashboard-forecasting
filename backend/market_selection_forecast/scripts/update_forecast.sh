#!/bin/bash
cd /home/ubuntu/market_analysis
source venv/bin/activate
# Run the data pipeline first to ensure market_analysis table has the latest actual data
python src/data_pipeline.py >> pipeline_cron.log 2>&1
# Then save the new 7-day forecast to the database
python src/save_forecast_to_db.py >> forecast_cron.log 2>&1

