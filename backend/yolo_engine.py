import os
import sys
import base64
import json
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEIGHTS_DIR = os.path.join(BASE_DIR, 'weights')

class YoloEngine:
    def __init__(self):
        self.model = None
        self.weights_path = None
        self.is_loaded = False
        self.classes = {}
        self.ultralytics_available = False
        self.check_dependencies()
        self.scan_and_load_weights()

    def check_dependencies(self):
        try:
            from ultralytics import YOLO
            self.ultralytics_available = True
        except ImportError:
            self.ultralytics_available = False

    def scan_and_load_weights(self):
        os.makedirs(WEIGHTS_DIR, exist_ok=True)
        potential_weights = [
            os.path.join(WEIGHTS_DIR, 'best.pt'),
            os.path.join(WEIGHTS_DIR, 'yolov8n.pt')
        ]
        if os.path.exists(WEIGHTS_DIR):
            for f in os.listdir(WEIGHTS_DIR):
                if f.endswith('.pt'):
                    potential_weights.insert(0, os.path.join(WEIGHTS_DIR, f))

        found = None
        for p in potential_weights:
            if os.path.exists(p) and os.path.getsize(p) > 1000:
                found = p
                break

        if found and self.ultralytics_available:
            try:
                from ultralytics import YOLO
                self.model = YOLO(found)
                self.weights_path = found
                self.is_loaded = True
                self.classes = self.model.names if hasattr(self.model, 'names') else {}
                print(f"[YOLO Engine] Successfully loaded weights: {found}")
            except Exception as e:
                print(f"[YOLO Engine] Error loading {found}: {e}")
                self.is_loaded = False
        else:
            self.is_loaded = False

    def get_status(self):
        return {
            'is_loaded': self.is_loaded,
            'status': 'ONLINE' if self.is_loaded else 'STANDBY (WEIGHTS PENDING)',
            'vision_mode': 'YOLO' if self.is_loaded else 'SIMULATION / MODEL PENDING',
            'ultralytics_installed': self.ultralytics_available,
            'weights_path': self.weights_path if self.is_loaded else None,
            'classes': self.classes if self.is_loaded else {
                0: 'drone',
                1: 'bird',
                2: 'airplane',
                3: 'helicopter'
            },
            'confidence_threshold': 0.45,
            'expected_file': 'backend/weights/best.pt',
            'inference_mode': 'NATIVE_YOLO' if self.is_loaded else 'SYNTHETIC_FRAME_FALLBACK',
            'metrics_status': 'NOT YET EVALUATED',
            'metrics': {
                'precision': None,
                'recall': None,
                'f1': None,
                'map50': None,
                'map50_95': None,
                'false_positives_per_sensor_hour': None,
                'benchmark_dataset': 'NOT_LOADED (Run backend/scripts/evaluate_vision.py with labeled test set)'
            }
        }

    def infer_frame(self, image_data=None, target_hint=None, in_fov=True, sensor_mode="EO", track_id=None, camera_id="CAM-03"):
        """
        Runs real YOLO inference if model is loaded and image is provided.
        Otherwise provides transparent simulated FOV fallback without claiming false real camera detection.
        Supports multi-object detection and persists to database.
        """
        import time
        from datetime import datetime, timezone
        from db import get_db

        t_start = time.perf_counter()
        ts_now = datetime.now(timezone.utc).isoformat()

        if self.is_loaded and image_data:
            try:
                import cv2
                if isinstance(image_data, str) and ',' in image_data:
                    image_data = image_data.split(',')[1]
                img_bytes = base64.b64decode(image_data)
                np_arr = np.frombuffer(img_bytes, np.uint8)
                img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

                results = self.model(img, conf=0.45, verbose=False)
                detections = []
                for r in results:
                    boxes = r.boxes
                    for box in boxes:
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        conf = float(box.conf[0])
                        cls_id = int(box.cls[0])
                        cls_name = self.classes.get(cls_id, str(cls_id))
                        detections.append({
                            'bbox': [round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)],
                            'confidence': round(conf, 3),
                            'class_id': cls_id,
                            'class_name': cls_name,
                            'track_id': track_id or f"TRK-OPT-{cls_id}",
                            'timestamp': ts_now
                        })

                elapsed_ms = round((time.perf_counter() - t_start) * 1000.0, 2)
                self._persist_detections(detections, camera_id, sensor_mode, is_simulated=False, latency_ms=elapsed_ms)

                return {
                    'success': True,
                    'inference_source': 'YOLO',
                    'vision_mode': 'YOLO',
                    'sensor_mode': sensor_mode,
                    'is_simulated': False,
                    'inference_time_ms': elapsed_ms,
                    'detections': detections,
                    'count': len(detections)
                }
            except Exception as e:
                print(f"[YOLO Engine] Inference error: {e}")

        # Transparent Synthetic FOV Fallback when model is pending or frame is simulated
        elapsed_ms = round((time.perf_counter() - t_start) * 1000.0 + 8.5, 2)
        if in_fov and target_hint:
            cls_name = target_hint.get('class_name', 'DRONE').lower()
            is_multi = target_hint.get('is_multi') or 'MULTI' in str(track_id).upper()

            if is_multi:
                # Multi-object detection scenario
                detections = [
                    {
                        'bbox': [240.0, 160.0, 360.0, 260.0],
                        'confidence': 0.942,
                        'class_id': 0,
                        'class_name': 'drone',
                        'track_id': track_id or 'TRK-MULTI-01',
                        'timestamp': ts_now
                    },
                    {
                        'bbox': [420.0, 110.0, 510.0, 190.0],
                        'confidence': 0.887,
                        'class_id': 1,
                        'class_name': 'bird',
                        'track_id': 'TRK-BIRD-02',
                        'timestamp': ts_now
                    }
                ]
            else:
                detections = [
                    {
                        'bbox': [265.0, 142.0, 375.0, 218.0],
                        'confidence': 0.948 if 'drone' in cls_name else 0.882,
                        'class_id': 0 if 'drone' in cls_name else (1 if 'bird' in cls_name else 2),
                        'class_name': cls_name,
                        'track_id': track_id or 'TRK-OPT-01',
                        'timestamp': ts_now
                    }
                ]

            self._persist_detections(detections, camera_id, sensor_mode, is_simulated=True, latency_ms=elapsed_ms)

            return {
                'success': True,
                'inference_source': 'SIMULATION / MODEL PENDING',
                'vision_mode': 'SIMULATION / MODEL PENDING',
                'sensor_mode': sensor_mode,
                'is_simulated': True,
                'inference_time_ms': elapsed_ms,
                'detections': detections,
                'count': len(detections)
            }

        return {
            'success': True,
            'inference_source': 'SIMULATION / MODEL PENDING (SEARCHING)',
            'vision_mode': 'SIMULATION / MODEL PENDING',
            'sensor_mode': sensor_mode,
            'is_simulated': True,
            'inference_time_ms': elapsed_ms,
            'detections': [],
            'count': 0
        }

    def _persist_detections(self, detections, camera_id, sensor_mode, is_simulated, latency_ms):
        try:
            from db import get_db
            conn = get_db()
            cursor = conn.cursor()
            for d in detections:
                cursor.execute("""
                    INSERT INTO vision_detections 
                    (camera_id, track_id, class_name, confidence, bbox, sensor_mode, is_simulated, inference_time_ms)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    camera_id,
                    d.get("track_id"),
                    d.get("class_name"),
                    d.get("confidence"),
                    json.dumps(d.get("bbox")),
                    sensor_mode,
                    1 if is_simulated else 0,
                    latency_ms
                ))
            conn.commit()
            conn.close()
        except Exception as e:
            pass

yolo_engine = YoloEngine()
