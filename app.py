from flask import Flask, request, jsonify
from flask_cors import CORS
import datetime
import random
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for GitHub Pages

@app.route('/')
def home():
    return jsonify({
        'message': 'Python script API is running!',
        'status': 'healthy',
        'timestamp': datetime.datetime.now().isoformat()
    })

@app.route('/api/run-script', methods=['POST'])
def run_script():
    try:
        # Get data from frontend (if any)
        data = request.get_json() or {}
        frontend_message = data.get('message', 'No message provided')
        
        # Your actual Python script logic goes here
        # This is just an example - replace with your real script
        
        # Simulate some processing
        processing_results = {
            'calculation': sum(range(1, 101)),  # Sum of 1-100
            'random_data': [random.randint(1, 100) for _ in range(10)],
            'text_processing': frontend_message.upper(),
            'current_time': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'squares': [i**2 for i in range(1, 6)]
        }
        
        result = {
            'status': 'success',
            'timestamp': datetime.datetime.now().isoformat(),
            'frontend_message': frontend_message,
            'message': 'Python script executed successfully on Render!',
            'results': processing_results,
            'server_info': {
                'platform': 'Render Free Tier',
                'python_version': '3.9+',
                'environment': os.environ.get('RENDER_SERVICE_NAME', 'Development')
            }
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Script execution failed: {str(e)}',
            'timestamp': datetime.datetime.now().isoformat()
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'Python Script API',
        'timestamp': datetime.datetime.now().isoformat()
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
