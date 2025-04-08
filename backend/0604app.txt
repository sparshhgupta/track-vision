from flask import Flask, request, jsonify, send_file
import cv2
import pandas as pd
from flask_cors import CORS
import os
import logging
import subprocess
from assesment import get_edge_frames, StoredResultsAssessment, load_tracking_results_from_csv

start_frames=[]
end_frames=[]

# Flask setup
app = Flask(__name__)
CORS(app)  # Enable CORS for all origins
os.makedirs('temp', exist_ok=True)

# Logging setup
logging.basicConfig(level=logging.INFO)

@app.route('/get-frame-numbers', methods=['GET'])
def get_frame_numbers():
    try:
        csv_path = get_uploaded_csv_path()
        if not csv_path:
            return jsonify({'error': 'CSV file not found'}), 400

        # Get end frames with their original track IDs
        frames_data = get_track_end_frames_with_ids(csv_path)
        
        if not frames_data:
            return jsonify({'error': 'No tracks found in CSV'}), 400

        logging.info(f"End frames with IDs: {frames_data}")
        return jsonify({
            'end_frames': [frame for frame, _ in frames_data],
            'track_ids': [track_id for _, track_id in frames_data]
        })

    except Exception as e:
        logging.error(f"Error in /get-frame-numbers: {e}")
        return jsonify({'error': str(e)}), 500


def get_track_end_frames_with_ids(csv_path):
    """Returns list of (end_frame, track_id) tuples preserving original order"""
    results = load_tracking_results_from_csv(csv_path)
    if not results:
        return []

    assessment = StoredResultsAssessment()
    assessment.process_stored_results(results)
    tracks_summary = assessment.get_tracks_summary()
    
    # Return as list of tuples (end_frame-20, original_track_id)
    return [
        (max(summary['end_frame'] - 20,0), track_id)
        for track_id, summary in tracks_summary.items()
    ]

# Global variable to store video path temporarily
video_storage = {}
def draw_bounding_boxes(video_path, csv_path):
    """
    Processes the video by drawing bounding boxes based on the CSV file.
    """
    try:
        # Read CSV file
        data = pd.read_csv(csv_path)
        logging.info(f"CSV data preview: {data.head()}")

        # Open the video
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Unable to open video file: {video_path}")
        logging.info("Video file opened successfully.")

        frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        fourcc = cv2.VideoWriter_fourcc(*'MJPG')  # Change from 'mp4v' to 'XVID'

        
        #output_path = os.path.join('temp', os.path.basename(video_path).replace('.mp4', '_processed.mp4'))
        output_path = os.path.join('temp', os.path.basename(video_path).replace('.mp4', '_processed.avi'))

        logging.info(f"Output video path: {output_path}")



        logging.info(f"Video Properties - Width: {frame_width}, Height: {frame_height}, FPS: {fps}")


        out = cv2.VideoWriter(output_path, fourcc, fps, (frame_width, frame_height))
        if not out.isOpened():
            raise ValueError(f"Unable to initialize video writer at {output_path}")

        frame_idx = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            # Filter bounding boxes for the current frame
            frame_boxes = data[data['frame'] == frame_idx]
            logging.info(f"Processing frame {frame_idx}, boxes: {len(frame_boxes)}")

            for _, row in frame_boxes.iterrows():
                # Extract bounding box coordinates and metadata
                x1, y1, x2, y2 = int(row['x1']), int(row['y1']), int(row['x2']), int(row['y2'])
                track_id, class_id, confidence = row['track_id'], row['class_id'], row['confidence']

                # Draw bounding box
                color = (0, 255, 0)
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

                # Add label
                label = f'ID: {track_id}, Class: {class_id}, Conf: {confidence:.2f}'
                cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

            out.write(frame)
            frame_idx += 1

        cap.release()
        out.release()
        logging.info("Video processing complete.")
        return output_path

    except Exception as e:
        logging.error(f"Error processing video: {e}")
        raise

@app.route('/save-logs', methods=['POST'])
def save_logs():
    data = request.json
    logs = data.get("logs", [])

    if not logs:
        return jsonify({"message": "No logs received"}), 400

    # Retrieve the uploaded CSV file path
    uploaded_csv_file = next((file for file in os.listdir('temp') if file.endswith('.csv')), None)

    if not uploaded_csv_file:
        return jsonify({"message": "CSV file is missing or not found"}), 400

    # Construct full path to the original CSV file
    original_csv_path = os.path.join('temp', uploaded_csv_file)

    # Load the CSV
    df = pd.read_csv(original_csv_path)
    csv_path = get_uploaded_csv_path()
    if not csv_path:
        return jsonify({'success': False, 'error': 'CSV file is missing or not found'}), 400
    # Apply each change (mapping old ID to new ID)
    for log in logs:
        old_id = log.get('A')  # Old ID
        new_id = log.get('B')  # New ID

        update_csv_ids(csv_path, old_id, new_id)
    
    mp4_output_path, error = process_video_with_updated_csv(csv_path)
    if error:
        return jsonify({'success': False, 'error': error}), 400

    return jsonify({'success': True, 'new_video': os.path.basename(mp4_output_path)}), 200


# Route to handle video upload
@app.route('/upload-video', methods=['POST'])
def upload_video():
    """
    API endpoint to receive and temporarily store a video file.
    """
    try:
        video_file = request.files.get('video')

        if not video_file:
            return jsonify({'error': 'Video file is required'}), 400

        video_path = os.path.join('temp', video_file.filename)
        video_file.save(video_path)
        logging.info(f"Received video: {video_path}")

        # Store the video path in global memory
        video_storage['video_path'] = video_path

        return jsonify({'success': True}), 200

    except Exception as e:
        logging.error(f"Error in /upload-video: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/upload', methods=['POST'])
def upload_files():
    """
    API endpoint to receive only CSV, process the video, and return the processed MP4 video file.
    """
    avi_output_path = None
    mp4_output_path = None

    try:
        # Receive CSV file
        csv_file = request.files.get('csv')

        if not csv_file:
            return jsonify({'error': 'CSV file is required'}), 400

        # Save CSV file temporarily
        csv_path = os.path.join('temp', csv_file.filename)
        csv_file.save(csv_path)
        logging.info(f"Received CSV: {csv_path}")

        # Retrieve the video path from the storage
        video_path = video_storage.get('video_path')

        if not video_path or not os.path.exists(video_path):
            return jsonify({'error': 'Video file is missing, please upload it first through /upload-video'}), 400

        # Process the video with CSV
        avi_output_path = draw_bounding_boxes(video_path, csv_path)

        # Convert the AVI output to MP4
        mp4_output_path = avi_output_path.replace('.avi', '.mp4')
        convert_to_mp4(avi_output_path, mp4_output_path)

        # Ensure MP4 output video path is valid
        if not os.path.exists(mp4_output_path):
            raise ValueError(f"Processed MP4 video not found: {mp4_output_path}")

        # Send the processed MP4 video as a response
        return send_file(mp4_output_path, as_attachment=True)

    except Exception as e:
        logging.error(f"Error in /upload: {e}")
        return jsonify({'error': f"Internal Server Error: {str(e)}"}), 500


@app.route('/temp/<filename>', methods=['GET'])
def get_processed_video(filename):
    """
    Serve the processed video file.
    """
    try:
        return send_file(os.path.join('temp', filename), as_attachment=False)
    except Exception as e:
        logging.error(f"Error serving video file {filename}: {e}")
        return jsonify({'error': 'File not found'}), 404
 

def get_uploaded_csv_path():
    """ Retrieves the path of the uploaded CSV file. """
    uploaded_csv_file = next((file for file in os.listdir('temp') if file.endswith('.csv')), None)
    return os.path.join('temp', uploaded_csv_file) if uploaded_csv_file else None


def update_csv_ids(csv_path, current_id, new_id):
    """ Updates the track_id in the CSV file. """
    df = pd.read_csv(csv_path)
    df.loc[df['track_id'] == int(current_id), 'track_id'] = int(new_id)
    df.to_csv(csv_path, index=False)
    logging.info(f"Updated track_id {current_id} to {new_id} in {csv_path}")


def process_video_with_updated_csv(csv_path):
    """ Processes the video using the updated CSV file and converts it to MP4. """
    video_path = video_storage.get('video_path')

    if not video_path or not os.path.exists(video_path):
        return None, "Video file is missing or not found"

    avi_output_path = draw_bounding_boxes(video_path, csv_path)
    mp4_output_path = avi_output_path.replace('.avi', '.mp4')
    convert_to_mp4(avi_output_path, mp4_output_path)

    if not os.path.exists(mp4_output_path):
        return None, f"Processed MP4 video not found: {mp4_output_path}"

    return mp4_output_path, None


@app.route('/update-id', methods=['POST'])
def update_id():
    """ API endpoint to update track_id in the CSV and reprocess the video. """
    try:
        data = request.json
        current_id = data.get('currentId')
        new_id = data.get('newId')

        if not current_id or not new_id:
            return jsonify({'success': False, 'error': 'Invalid request data'}), 400

        csv_path = get_uploaded_csv_path()
        if not csv_path:
            return jsonify({'success': False, 'error': 'CSV file is missing or not found'}), 400

        update_csv_ids(csv_path, current_id, new_id)

        mp4_output_path, error = process_video_with_updated_csv(csv_path)
        if error:
            return jsonify({'success': False, 'error': error}), 400

        return jsonify({'success': True, 'new_video': os.path.basename(mp4_output_path)}), 200

    except Exception as e:
        logging.error(f"Error in /update-id: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


def convert_to_mp4(avi_path, mp4_path):
    """
    Converts an AVI video file to MP4 format using ffmpeg.
    """
    try:
        command = [
            'ffmpeg', '-i', avi_path, '-c:v', 'libx264', '-preset', 'fast',
            '-crf', '23', '-c:a', 'aac', '-strict', 'experimental', mp4_path
        ]
        subprocess.run(command, check=True)
        logging.info(f"Converted AVI to MP4: {mp4_path}")
    except subprocess.CalledProcessError as e:
        logging.error(f"Error during AVI to MP4 conversion: {e}")
        raise ValueError("Failed to convert AVI to MP4")


if __name__ == '__main__':
    app.run(debug=True)