from flask import Flask, request, jsonify
from flask_cors import CORS
import datetime
import pytz
import os
import subprocess
import sys
import json

app = Flask(__name__)
CORS(app)  # Enable CORS for GitHub Pages

def get_eastern_date():
    """Get current date in Eastern Time formatted as YYYYMMDD"""
    eastern = pytz.timezone('US/Eastern')
    now = datetime.datetime.now(eastern)
    return now.strftime('%Y%m%d')

def get_report_filename():
    """Generate the expected report filename based on current date"""
    date_str = get_eastern_date()
    return f"line_movement_report_{date_str}.txt"

def run_line_movement_script(script_code):
    """Execute the Python script code and return results"""
    try:
        # Create a temporary Python file
        script_filename = "temp_line_movement_script.py"
        
        with open(script_filename, 'w') as f:
            f.write(script_code)
        
        # Execute the script
        result = subprocess.run([sys.executable, script_filename], 
                              capture_output=True, text=True, timeout=300)
        
        # Clean up temporary file
        if os.path.exists(script_filename):
            os.remove(script_filename)
        
        if result.returncode != 0:
            raise Exception(f"Script execution failed: {result.stderr}")
        
        return {
            'success': True,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'return_code': result.returncode
        }
        
    except subprocess.TimeoutExpired:
        raise Exception("Script execution timed out (5 minutes)")
    except Exception as e:
        raise Exception(f"Error running script: {str(e)}")

def read_report_file():
    """Read the generated line movement report file"""
    report_filename = get_report_filename()
    
    # Check if file exists
    if not os.path.exists(report_filename):
        return {
            'found': False,
            'filename': report_filename,
            'message': f"Report file {report_filename} not found. Make sure your script generates this file."
        }
    
    try:
        with open(report_filename, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Get file stats
        file_stats = os.stat(report_filename)
        file_size = file_stats.st_size
        modified_time = datetime.datetime.fromtimestamp(file_stats.st_mtime)
        
        return {
            'found': True,
            'filename': report_filename,
            'content': content,
            'file_size': file_size,
            'modified_time': modified_time.isoformat(),
            'line_count': len(content.split('\n')) if content else 0
        }
        
    except Exception as e:
        return {
            'found': True,
            'filename': report_filename,
            'error': f"Error reading file: {str(e)}"
        }

@app.route('/')
def home():
    return jsonify({
        'message': 'Line Movement Script API is running!',
        'status': 'healthy',
        'timestamp': datetime.datetime.now().isoformat(),
        'expected_report_file': get_report_filename(),
        'current_eastern_date': get_eastern_date()
    })

@app.route('/api/run-script', methods=['POST'])
def run_script():
    try:
        data = request.get_json() or {}
        
        # Get the Python script code from the request
        script_code = data.get('script_code', '')
        
        if not script_code:
            return jsonify({
                'status': 'error',
                'message': 'No script code provided. Please include "script_code" in your request body.',
                'timestamp': datetime.datetime.now().isoformat()
            }), 400
        
        # Run the script
        execution_result = run_line_movement_script(script_code)
        
        # Read the generated report file
        report_data = read_report_file()
        
        # Prepare the response
        result = {
            'status': 'success',
            'timestamp': datetime.datetime.now().isoformat(),
            'eastern_date': get_eastern_date(),
            'script_execution': execution_result,
            'report_file': report_data,
            'message': 'Script executed successfully!'
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Script execution failed: {str(e)}',
            'timestamp': datetime.datetime.now().isoformat(),
            'eastern_date': get_eastern_date()
        }), 500

@app.route('/api/read-report', methods=['GET'])
def read_report_only():
    """Endpoint to just read the existing report file without running script"""
    try:
        report_data = read_report_file()
        
        return jsonify({
            'status': 'success',
            'timestamp': datetime.datetime.now().isoformat(),
            'eastern_date': get_eastern_date(),
            'report_file': report_data
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Error reading report: {str(e)}',
            'timestamp': datetime.datetime.now().isoformat()
        }), 500

@app.route('/api/list-files', methods=['GET'])
def list_files():
    """List all files in the current directory for debugging"""
    try:
        files = []
        for filename in os.listdir('.'):
            if os.path.isfile(filename):
                stat = os.stat(filename)
                files.append({
                    'name': filename,
                    'size': stat.st_size,
                    'modified': datetime.datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
        
        return jsonify({
            'status': 'success',
            'files': files,
            'expected_report': get_report_filename(),
            'current_directory': os.getcwd()
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'Line Movement Script API',
        'timestamp': datetime.datetime.now().isoformat(),
        'timezone': 'US/Eastern',
        'expected_report_filename': get_report_filename()
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
