from flask import Flask, request, jsonify
from flask_cors import CORS
import datetime
import os
import subprocess
import sys
import tempfile
import requests
from pathlib import Path
import pytz

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return jsonify({
        'message': 'Line Movement Report API is running!',
        'status': 'healthy',
        'timestamp': datetime.datetime.now().isoformat(),
        'timezone': 'Eastern Standard Time'
    })

@app.route('/api/run-script', methods=['POST'])
def run_script():
    try:
        data = request.get_json() or {}
        script_url = data.get('script_url', '').strip()
        
        if not script_url:
            return jsonify({
                'status': 'error',
                'message': 'No script URL provided. Please provide the GitHub raw URL to your Python script.',
                'timestamp': datetime.datetime.now().isoformat()
            }), 400
        
        # Validate GitHub raw URL
        if 'raw.githubusercontent.com' not in script_url and 'github.com' in script_url:
            # Convert regular GitHub URL to raw URL
            script_url = script_url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/')
        
        # Download the script
        try:
            response = requests.get(script_url, timeout=30)
            response.raise_for_status()
            script_content = response.text
        except requests.RequestException as e:
            return jsonify({
                'status': 'error',
                'message': f'Failed to download script: {str(e)}',
                'timestamp': datetime.datetime.now().isoformat()
            }), 400
        
        # Get current date in EST for filename
        est = pytz.timezone('US/Eastern')
        current_date = datetime.datetime.now(est).strftime('%Y%m%d')
        expected_filename = f'line_movement_report_{current_date}.txt'
        
        # Create temporary directory for script execution
        with tempfile.TemporaryDirectory() as temp_dir:
            script_path = os.path.join(temp_dir, 'user_script.py')
            
            # Write script to temporary file
            with open(script_path, 'w', encoding='utf-8') as f:
                f.write(script_content)
            
            # Execute the script
            try:
                # Change to temp directory so any file outputs go there
                original_cwd = os.getcwd()
                os.chdir(temp_dir)
                
                # Run the script
                result = subprocess.run(
                    [sys.executable, script_path], 
                    capture_output=True, 
                    text=True, 
                    timeout=300  # 5 minute timeout
                )
                
                # Change back to original directory
                os.chdir(original_cwd)
                
                # Check for execution errors
                if result.returncode != 0:
                    return jsonify({
                        'status': 'error',
                        'message': 'Script execution failed',
                        'error_output': result.stderr,
                        'script_output': result.stdout,
                        'timestamp': datetime.datetime.now().isoformat()
                    }), 500
                
                # Look for the line movement report file
                report_content = None
                report_filename = None
                
                # Check for files in temp directory
                temp_files = list(Path(temp_dir).glob('*.txt'))
                
                # First, look for the expected filename
                expected_file = Path(temp_dir) / expected_filename
                if expected_file.exists():
                    report_filename = expected_filename
                    with open(expected_file, 'r', encoding='utf-8') as f:
                        report_content = f.read()
                else:
                    # Look for any line_movement_report_*.txt file
                    for file_path in temp_files:
                        if 'line_movement_report_' in file_path.name:
                            report_filename = file_path.name
                            with open(file_path, 'r', encoding='utf-8') as f:
                                report_content = f.read()
                            break
                    
                    # If no line movement report found, look for any .txt file
                    if not report_content and temp_files:
                        report_filename = temp_files[0].name
                        with open(temp_files[0], 'r', encoding='utf-8') as f:
                            report_content = f.read()
                
                # Prepare response
                response_data = {
                    'status': 'success',
                    'timestamp': datetime.datetime.now().isoformat(),
                    'execution_time': datetime.datetime.now(est).strftime('%Y-%m-%d %H:%M:%S %Z'),
                    'script_url': script_url,
                    'script_output': result.stdout,
                    'expected_filename': expected_filename,
                    'server_info': {
                        'platform': 'Render',
                        'timezone': 'Eastern Standard Time',
                        'temp_directory': temp_dir,
                        'files_created': [f.name for f in temp_files]
                    }
                }
                
                if report_content:
                    response_data.update({
                        'report_found': True,
                        'report_filename': report_filename,
                        'report_content': report_content,
                        'report_size': len(report_content),
                        'report_lines': len(report_content.splitlines())
                    })
                else:
                    response_data.update({
                        'report_found': False,
                        'message': f'No line movement report file found. Expected: {expected_filename}',
                        'files_in_directory': [f.name for f in Path(temp_dir).iterdir()]
                    })
                
                return jsonify(response_data)
                
            except subprocess.TimeoutExpired:
                return jsonify({
                    'status': 'error',
                    'message': 'Script execution timeout (5 minutes)',
                    'timestamp': datetime.datetime.now().isoformat()
                }), 408
            
            except Exception as e:
                return jsonify({
                    'status': 'error',
                    'message': f'Script execution error: {str(e)}',
                    'timestamp': datetime.datetime.now().isoformat()
                }), 500
    
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Unexpected error: {str(e)}',
            'timestamp': datetime.datetime.now().isoformat()
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    est = pytz.timezone('US/Eastern')
    current_time = datetime.datetime.now(est)
    
    return jsonify({
        'status': 'healthy',
        'service': 'Line Movement Report API',
        'timestamp': datetime.datetime.now().isoformat(),
        'eastern_time': current_time.strftime('%Y-%m-%d %H:%M:%S %Z'),
        'expected_filename_today': f'line_movement_report_{current_time.strftime("%Y%m%d")}.txt',
        'server_capabilities': [
            'Python script execution',
            'File output capture',
            'Line movement report parsing',
            'EST timezone support'
        ]
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
