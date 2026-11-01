from flask import Flask, jsonify, render_template
from flask_cors import CORS
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.predict_tomorrow import predict_tomorrow

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return render_template('index.html')

from flask import request

@app.route('/api/predict', methods=['GET'])
def get_prediction():
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        results = predict_tomorrow(start_date=start_date, end_date=end_date)
        if "error" in results:
            return jsonify(results), 500
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=3001)

