import pandas as pd
import numpy as np

def load_tracking_results_from_csv(csv_path='tracking_results.csv'):
    # Read the CSV file
    df = pd.read_csv(csv_path)

    # Initialize a dictionary to group results by frame
    results_by_frame = {}

    for _, row in df.iterrows():
        frame_idx = int(row['frame'])

        # Create dictionary for each detection
        detection = {
            "track_id": int(row['track_id']),
            "class_id": int(row['class_id']),
            "confidence": float(row['confidence']),
            "boxes": [float(row['x1']), float(row['y1']), float(row['x2']), float(row['y2'])]
        }

        # Add detection to the corresponding frame
        if frame_idx not in results_by_frame:
            results_by_frame[frame_idx] = []
        results_by_frame[frame_idx].append(detection)

    # Convert the dictionary to a list format, one entry per frame
    max_frame = max(results_by_frame.keys()) + 1
    results = [results_by_frame.get(frame_idx, []) for frame_idx in range(max_frame)]

    print("Tracking results successfully loaded from", csv_path)
    return results

import pandas as pd
import numpy as np

def save_tracking_results_to_csv(results, output_path='tracking_results.csv'):

    frame_numbers = []
    track_ids = []
    classes = []
    confidences = []
    x1_coords = []
    y1_coords = []
    x2_coords = []
    y2_coords = []

    for frame_idx, result in enumerate(results):
        boxes = result.boxes

        if len(boxes) > 0:
            coords = boxes.xyxy.cpu().numpy()

            conf = boxes.conf.cpu().numpy()

            cls = boxes.cls.cpu().numpy()

            if hasattr(boxes, 'id'):
                ids = boxes.id.cpu().numpy()
            else:
                ids = np.array([-1] * len(coords))

            for box_idx in range(len(coords)):
                frame_numbers.append(frame_idx)
                track_ids.append(int(ids[box_idx]) if ids[box_idx] is not None else -1)
                classes.append(int(cls[box_idx]))
                confidences.append(float(conf[box_idx]))
                x1_coords.append(float(coords[box_idx][0]))
                y1_coords.append(float(coords[box_idx][1]))
                x2_coords.append(float(coords[box_idx][2]))
                y2_coords.append(float(coords[box_idx][3]))

    df = pd.DataFrame({
        'frame': frame_numbers,
        'track_id': track_ids,
        'class_id': classes,
        'confidence': confidences,
        'x1': x1_coords,
        'y1': y1_coords,
        'x2': x2_coords,
        'y2': y2_coords
    })

    df.to_csv(output_path, index=False)
    print(f"Results saved to {output_path}")

    return df