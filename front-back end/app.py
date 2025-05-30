from flask import Flask, request, jsonify, render_template, send_from_directory
import os
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from PIL import Image
import io
from datetime import datetime

app = Flask(__name__)

model = load_model('my_model_h5.h5')
class_names = ['glass', 'metal', 'paper', 'plastic']

analytics_data = {
    'counts': {'glass': 0, 'metal': 0, 'paper': 0, 'plastic': 0},
    'history': [],
    'last_updated': None
}

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/analytics')
def analytics():
    return render_template('analytics.html')

@app.route('/classify', methods=['POST'])
def classify_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
        
    file = request.files['image']
    
    try:
        img = Image.open(io.BytesIO(file.read()))  
        img = img.resize((175, 175))
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0) / 255.0
        
        prediction = model.predict(img_array)
        class_idx = np.argmax(prediction[0])
        classification = class_names[class_idx]
        
        analytics_data['counts'][classification] += 1
        analytics_data['history'].append({
            'type': classification,
            'timestamp': datetime.now().isoformat(),
            'probabilities': {
                'glass': float(prediction[0][0]),
                'metal': float(prediction[0][1]),
                'paper': float(prediction[0][2]),
                'plastic': float(prediction[0][3])
            }
        })
        analytics_data['last_updated'] = datetime.now().isoformat()
        
        return jsonify({
            'classification': classification,
            'probabilities': {
                'glass': float(prediction[0][0]),
                'metal': float(prediction[0][1]),
                'paper': float(prediction[0][2]),
                'plastic': float(prediction[0][3])
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics')
def get_analytics():
    return jsonify({
        'counts': analytics_data['counts'],
        'weekly_trends': calculate_weekly_trends(),
        'last_updated': analytics_data['last_updated']
    })

def calculate_weekly_trends():
    trends = {t: [0]*7 for t in class_names}
    
    for entry in analytics_data['history']:
        try:
            dt = datetime.fromisoformat(entry['timestamp'])
            day_of_week = dt.weekday()  # Monday=0 to Sunday=6
            trends[entry['type']][day_of_week] += 1
        except:
            continue
    
    return trends

@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    app.run(debug=True)