from flask import Flask, jsonify, request, send_from_directory
import cv2
import numpy as np
import base64
import threading
from pose_processor import FingerSplayTracker
import logging
from flask_cors import CORS
from werkzeug.middleware.dispatcher import DispatcherMiddleware

app = Flask(__name__)
CORS(app)
app.wsgi_app = DispatcherMiddleware(app.wsgi_app, {
    '/static': Flask(__name__, static_folder='static')
})

tracker = FingerSplayTracker()
processing_lock = threading.Lock()
logger = logging.getLogger(__name__)
def base64_to_cv2(image_base64):
    if ',' in image_base64:
        image_base64 = image_base64.split(',')[1]
    img_bytes = base64.b64decode(image_base64)
    nparr = np.frombuffer(img_bytes, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)


@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/favicon.ico')
def favicon():
    return '', 204

@app.route('/api/process', methods=['POST'])
def process_frame():
    try:
        data = request.get_json()
        with processing_lock:
            frame = base64_to_cv2(data['image'])
            results = tracker.process_frame(frame)
            
            # Log rep count changes
            if 'splay_count' in results:
                logger.info(f"Rep count update: {results['splay_count']}")
                
            return jsonify({
                'success': True,
                'splay_count': results['splay_count'],
                'current_hand': results['current_hand'],
                'progress': results['progress'],
                'exercise_complete': results['exercise_complete'],
                'hand_detected': results['hand_detected']
            })
            
    except Exception as e:
        logger.error(f"Processing error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/start', methods=['POST'])
def start_tracking():
    try:
        data = request.get_json()
        reps = data.get('reps', 10)
        tracker.reset_tracking(reps)
        return jsonify({
            'success': True,
            'message': f'Tracking started for {reps} reps'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/stop', methods=['POST'])
def stop_tracking():
    tracker.stop()
    return jsonify({'success': True, 'message': 'Tracking stopped'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, threaded=True)