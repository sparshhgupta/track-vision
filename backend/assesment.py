import numpy as np
from collections import defaultdict
from typing import List, Dict
from dataclasses import dataclass
from csv_rendering import load_tracking_results_from_csv

@dataclass
class Boxes:
    xyxy: np.ndarray
    id: np.ndarray
    conf: np.ndarray
    cls: np.ndarray

@dataclass
class Result:
    boxes: Boxes

class StoredResultsAssessment:
    def __init__(self):
        self.reset()

    def reset(self):
        self.total_frames = 0
        self.tracks = defaultdict(list)
        self.frame_counts = defaultdict(int)
        self.track_gaps = defaultdict(list)
        self.velocity_history = defaultdict(list)
        self.bbox_sizes = defaultdict(list)
        self.confidence_scores = defaultdict(list)

    def process_stored_results(self, results, min_confidence: float = 0.3):
        for frame_idx, frame_detections in enumerate(results):
            self.total_frames += 1
            
            # Convert frame detections to boxes format
            if frame_detections:
                boxes_list = []
                ids_list = []
                conf_list = []
                cls_list = []
                
                for det in frame_detections:
                    boxes_list.append(det["boxes"])
                    ids_list.append(det["track_id"])
                    conf_list.append(det["confidence"])
                    cls_list.append(det["class_id"])
                
                boxes = Boxes(
                    xyxy=np.array(boxes_list),
                    id=np.array(ids_list),
                    conf=np.array(conf_list),
                    cls=np.array(cls_list)
                )
                
                valid_detections = boxes.conf > min_confidence
                self.frame_counts[frame_idx] = np.sum(valid_detections)

                for box, track_id, conf in zip(boxes.xyxy[valid_detections],
                                             boxes.id[valid_detections],
                                             boxes.conf[valid_detections]):
                    track_id = int(track_id)

                    self.tracks[track_id].append((frame_idx, box, conf))
                    self.confidence_scores[track_id].append(conf)

                    width = box[2] - box[0]
                    height = box[3] - box[1]
                    size = width * height
                    self.bbox_sizes[track_id].append(size)

                    if len(self.tracks[track_id]) >= 2:
                        prev_frame, prev_box, _ = self.tracks[track_id][-2]
                        if frame_idx - prev_frame == 1:
                            center_x = (box[0] + box[2]) / 2
                            center_y = (box[1] + box[3]) / 2
                            prev_center_x = (prev_box[0] + prev_box[2]) / 2
                            prev_center_y = (prev_box[1] + prev_box[3]) / 2

                            velocity = np.sqrt((center_x - prev_center_x)**2 +
                                             (center_y - prev_center_y)**2)
                            self.velocity_history[track_id].append(velocity)

                    if len(self.tracks[track_id]) >= 2:
                        prev_frame = self.tracks[track_id][-2][0]
                        if frame_idx - prev_frame > 1:
                            self.track_gaps[track_id].append((prev_frame, frame_idx))

    def get_tracks_summary(self) -> Dict:
        summary = {}
        for track_id in self.tracks:
            detections = self.tracks[track_id]
            frames = [f for f, _, _ in detections]

            summary[track_id] = {
                'start_frame': min(frames),
                'end_frame': max(frames),
                'total_detections': len(frames),
                'gaps': len(self.track_gaps[track_id]),
                'avg_confidence': np.mean(self.confidence_scores[track_id])
            }
        return summary

    def compute_metrics(self) -> Dict:
        metrics = {}

        metrics['total_tracks'] = len(self.tracks)
        metrics['total_frames'] = self.total_frames
        metrics['avg_detections_per_frame'] = np.mean(list(self.frame_counts.values()))

        track_durations = []
        track_fragmentations = []
        velocity_consistencies = []
        size_consistencies = []
        confidence_stabilities = []

        for track_id in self.tracks:
            frames = [f for f, _, _ in self.tracks[track_id]]
            duration = max(frames) - min(frames) + 1
            track_durations.append(duration)

            gaps = len(self.track_gaps[track_id])
            track_fragmentations.append(gaps)

            if len(self.velocity_history[track_id]) > 1:
                velocity_std = np.std(self.velocity_history[track_id])
                velocity_consistencies.append(velocity_std)

            if len(self.bbox_sizes[track_id]) > 1:
                size_std = np.std(self.bbox_sizes[track_id])
                size_mean = np.mean(self.bbox_sizes[track_id])
                size_cv = size_std / size_mean if size_mean > 0 else float('inf')
                size_consistencies.append(size_cv)

            if len(self.confidence_scores[track_id]) > 1:
                conf_std = np.std(self.confidence_scores[track_id])
                confidence_stabilities.append(conf_std)

        metrics['avg_track_duration'] = np.mean(track_durations)
        metrics['max_track_duration'] = np.max(track_durations)
        metrics['min_track_duration'] = np.min(track_durations)
        metrics['avg_track_fragmentation'] = np.mean(track_fragmentations)

        if velocity_consistencies:
            metrics['avg_velocity_consistency'] = np.mean(velocity_consistencies)
        if size_consistencies:
            metrics['avg_size_consistency'] = np.mean(size_consistencies)
        if confidence_stabilities:
            metrics['avg_confidence_stability'] = np.mean(confidence_stabilities)

        stability_factors = []
        if size_consistencies:
            stability_factors.append(1 / (1 + np.mean(size_consistencies)))
        if velocity_consistencies:
            stability_factors.append(1 / (1 + np.mean(velocity_consistencies)))
        if confidence_stabilities:
            stability_factors.append(1 / (1 + np.mean(confidence_stabilities)))

        metrics['track_stability_score'] = np.mean(stability_factors) if stability_factors else 0

        return metrics

    def get_problematic_tracks(self,
                             min_duration: int = 10,
                             max_gaps: int = 3,
                             min_confidence: float = 0.4) -> List[int]:
        """Identify potentially problematic tracks"""
        problematic_tracks = []

        for track_id in self.tracks:
            frames = [f for f, _, _ in self.tracks[track_id]]
            duration = max(frames) - min(frames) + 1
            gaps = len(self.track_gaps[track_id])
            avg_conf = np.mean(self.confidence_scores[track_id])

            if (duration < min_duration or
                gaps > max_gaps or
                avg_conf < min_confidence):
                problematic_tracks.append(track_id)

        return problematic_tracks

    def print_metrics(self) -> None:
        """Print metrics in a formatted way"""
        metrics = self.compute_metrics()
        print("\nTracking Assessment Metrics:")
        print("-" * 50)
        for metric, value in metrics.items():
            if isinstance(value, float):
                print(f"{metric:25s}: {value:.3f}")
            else:
                print(f"{metric:25s}: {value}")


def get_edge_frames(csv_file):
    results = load_tracking_results_from_csv(csv_file)
    assessment = StoredResultsAssessment()
    assessment.process_stored_results(results)
    tracks_summary = assessment.get_tracks_summary()

    if not tracks_summary:
        return None, None  # Handle case where no tracks are present

    start_frame = (summary["start_frame"] for summary in tracks_summary.values())
    end_frame = (summary["end_frame"] for summary in tracks_summary.values())

    return start_frame, end_frame