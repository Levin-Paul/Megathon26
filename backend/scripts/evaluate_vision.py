import os
import sys
import argparse
import json

def evaluate_vision_model(weights_path: str, data_yaml_path: str):
    print("=== AeroGuard Track-A Vision Evaluation Benchmark ===")
    if not os.path.exists(weights_path):
        print(f"Error: Weights file '{weights_path}' not found.")
        print("Status: METRICS: NOT YET EVALUATED (Weights Pending)")
        return

    if not os.path.exists(data_yaml_path):
        print(f"Error: Labeled test dataset YAML '{data_yaml_path}' not found.")
        print("Status: METRICS: NOT YET EVALUATED (Dataset Pending)")
        return

    try:
        from ultralytics import YOLO
        model = YOLO(weights_path)
        print(f"Loaded YOLO model: {weights_path}")
        print(f"Running validation benchmark on: {data_yaml_path}...")
        metrics = model.val(data=data_yaml_path, split="test", verbose=True)

        results = {
            "status": "EVALUATED",
            "weights": weights_path,
            "precision": float(metrics.box.p[0]) if hasattr(metrics.box, 'p') else 0.0,
            "recall": float(metrics.box.r[0]) if hasattr(metrics.box, 'r') else 0.0,
            "f1": float(metrics.box.f1[0]) if hasattr(metrics.box, 'f1') else 0.0,
            "map50": float(metrics.box.map50) if hasattr(metrics.box, 'map50') else 0.0,
            "map50_95": float(metrics.box.map) if hasattr(metrics.box, 'map') else 0.0,
            "classes": model.names
        }

        print("\n=== Benchmark Results ===")
        print(json.dumps(results, indent=2))
        return results
    except Exception as e:
        print(f"Evaluation error: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate YOLO on Track-A drone surveillance test dataset")
    parser.add_argument("--weights", default="weights/best.pt", help="Path to YOLO weights (.pt)")
    parser.add_argument("--data", default="data/drone_dataset.yaml", help="Path to dataset YAML config")
    args = parser.parse_args()
    evaluate_vision_model(args.weights, args.data)
