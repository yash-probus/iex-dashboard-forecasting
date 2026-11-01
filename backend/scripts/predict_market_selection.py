import sys
import os
import json

# Add market_selection_forecast directory to import path
current_dir = os.path.dirname(os.path.abspath(__file__))
candidate_dirs = [
    os.path.abspath(os.path.join(current_dir, '..', 'market_selection_forecast')),
    os.path.abspath(os.path.join(current_dir, 'market_selection_forecast')),
    os.path.abspath(os.path.join(current_dir, '..', 'backend', 'market_selection_forecast')),
]
forecast_dir = next((d for d in candidate_dirs if os.path.exists(d)), candidate_dirs[0])
if forecast_dir not in sys.path:
    sys.path.insert(0, forecast_dir)
src_dir = os.path.join(forecast_dir, 'src')
if os.path.exists(src_dir) and src_dir not in sys.path:
    sys.path.insert(0, src_dir)

try:
    from src.predict_tomorrow import predict_tomorrow
except ImportError:
    from predict_tomorrow import predict_tomorrow

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Missing start_date and end_date arguments. Usage: python predict_market_selection.py <start_date> <end_date>"}))
        sys.exit(1)
        
    start_date = sys.argv[1]
    end_date = sys.argv[2]
    
    try:
        results = predict_tomorrow(start_date=start_date, end_date=end_date)
        print(json.dumps(results))
    except Exception as e:
        print(json.dumps({"error": f"Error running predictions: {str(e)}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
