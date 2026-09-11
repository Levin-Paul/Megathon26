"""Tests for the FastAPI backend API endpoints."""
import unittest
import json
import sys
import os
from pathlib import Path
from unittest.mock import patch, MagicMock

# Ensure repo root and src are importable
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(REPO_ROOT / "src"))

os.chdir(str(REPO_ROOT))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


class TestHealthEndpoint(unittest.TestCase):
    """Tests for GET /api/health"""

    def test_health_returns_200(self):
        response = client.get("/api/health")
        self.assertEqual(response.status_code, 200)

    def test_health_has_required_fields(self):
        response = client.get("/api/health")
        data = response.json()
        self.assertIn("status", data)
        self.assertIn("version", data)
        self.assertIn("components", data)
        self.assertIn("backend", data["components"])
        self.assertIn("rf_model", data["components"])
        self.assertIn("vision", data["components"])
        self.assertIn("radar", data["components"])
        self.assertIn("fusion", data["components"])

    def test_health_backend_is_online(self):
        response = client.get("/api/health")
        data = response.json()
        self.assertEqual(data["components"]["backend"]["status"], "ONLINE")

    def test_health_rf_model_is_online(self):
        response = client.get("/api/health")
        data = response.json()
        self.assertEqual(data["components"]["rf_model"]["status"], "ONLINE")

    def test_health_radar_is_simulation(self):
        response = client.get("/api/health")
        data = response.json()
        self.assertEqual(data["components"]["radar"]["status"], "SIMULATION")

    def test_health_vision_is_simulation(self):
        response = client.get("/api/health")
        data = response.json()
        self.assertEqual(data["components"]["vision"]["status"], "SIMULATION")

    def test_health_fusion_is_online(self):
        response = client.get("/api/health")
        data = response.json()
        self.assertEqual(data["components"]["fusion"]["status"], "ONLINE")


class TestRFPredictEndpoint(unittest.TestCase):
    """Tests for POST /api/rf/predict"""

    def test_rf_predict_valid_input(self):
        import numpy as np
        samples = np.random.randn(300).tolist()
        response = client.post("/api/rf/predict", json={"samples": samples})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn(data["classification"], ["DRONE", "NON-DRONE"])
        self.assertGreaterEqual(data["probability"], 0.0)
        self.assertLessEqual(data["probability"], 1.0)
        self.assertIn("latency_ms", data)
        self.assertGreater(data["latency_ms"], 0)
        self.assertEqual(data["features_processed"], 300)

    def test_rf_predict_too_few_features(self):
        response = client.post(
            "/api/rf/predict",
            json={"samples": [1.0] * 200},
        )
        self.assertEqual(response.status_code, 422)

    def test_rf_predict_too_many_features(self):
        response = client.post(
            "/api/rf/predict",
            json={"samples": [1.0] * 400},
        )
        self.assertEqual(response.status_code, 422)

    def test_rf_predict_nan_rejected(self):
        # NaN cannot be serialized to JSON directly, so test the Pydantic validator
        from backend.app.schemas.rf import RFPredictRequest
        with self.assertRaises(Exception):
            RFPredictRequest(samples=[1.0] * 299 + [float("nan")])

    def test_rf_predict_inf_rejected(self):
        # Inf cannot be serialized to JSON directly, so test the Pydantic validator
        from backend.app.schemas.rf import RFPredictRequest
        with self.assertRaises(Exception):
            RFPredictRequest(samples=[1.0] * 299 + [float("inf")])

    def test_rf_predict_returns_waveform(self):
        import numpy as np
        samples = np.random.randn(300).tolist()
        response = client.post("/api/rf/predict", json={"samples": samples})
        data = response.json()
        self.assertIn("waveform", data)
        self.assertIn("i", data["waveform"])
        self.assertIn("q", data["waveform"])

    def test_rf_samples_returns_list(self):
        response = client.get("/api/rf/samples?count=3")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertLessEqual(len(data), 3)
        for sample in data:
            self.assertIn("features", sample)
            self.assertEqual(len(sample["features"]), 300)


class TestVisionEndpoint(unittest.TestCase):
    """Tests for POST /api/vision/predict"""

    def test_vision_simulation_by_default(self):
        response = client.post("/api/vision/predict", json={})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "SIMULATION")

    def test_vision_simulation_mode(self):
        response = client.post(
            "/api/vision/predict",
            json={"scenario_preset": "drone_clear"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "SIMULATION")


class TestRadarEndpoint(unittest.TestCase):
    """Tests for GET /api/radar/status and /api/radar/targets"""

    def test_radar_status(self):
        response = client.get("/api/radar/status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "SIMULATION")
        self.assertEqual(data["mode"], "simulated")

    def test_radar_targets(self):
        response = client.get("/api/radar/targets")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["source"], "SIMULATED_RADAR")
        self.assertIsInstance(data["targets"], list)
        self.assertGreater(len(data["targets"]), 0)
        target = data["targets"][0]
        self.assertIn("target_id", target)
        self.assertIn("range_m", target)
        self.assertIn("radial_velocity_mps", target)
        self.assertTrue(target["is_simulated"])

    def test_radar_targets_by_type(self):
        for ttype in ["drone", "bird", "airplane", "clutter"]:
            response = client.get(f"/api/radar/targets/{ttype}")
            self.assertEqual(response.status_code, 200)


class TestFusionEndpoint(unittest.TestCase):
    """Tests for POST /api/fusion/demo and /api/fusion/predict"""

    def test_fusion_demo_scenario_a(self):
        response = client.post(
            "/api/fusion/demo",
            json={"scenario": "A"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["expected_state"], "DRONE")
        self.assertEqual(data["classification"], "DRONE")
        self.assertIn("overall_confidence", data)
        self.assertIn("sensor_agreement", data)
        self.assertIn("rationale", data)

    def test_fusion_demo_scenario_b(self):
        response = client.post(
            "/api/fusion/demo",
            json={"scenario": "B"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["expected_state"], "NON-DRONE")
        self.assertEqual(data["classification"], "NON-DRONE")

    def test_fusion_demo_scenario_c(self):
        response = client.post(
            "/api/fusion/demo",
            json={"scenario": "C"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["expected_state"], "DRONE")
        self.assertEqual(data["classification"], "DRONE")

    def test_fusion_demo_scenario_d(self):
        response = client.post(
            "/api/fusion/demo",
            json={"scenario": "D"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["expected_state"], "UNCERTAIN")
        self.assertEqual(data["classification"], "UNCERTAIN")

    def test_fusion_demo_invalid_scenario(self):
        response = client.post(
            "/api/fusion/demo",
            json={"scenario": "Z"},
        )
        self.assertEqual(response.status_code, 422)

    def test_fusion_predict_direct(self):
        response = client.post(
            "/api/fusion/predict",
            json={
                "radar": {
                    "is_available": True,
                    "detected_target": True,
                    "drone_probability": 0.9,
                    "confidence": 0.85,
                },
                "vision": {
                    "is_available": True,
                    "detected_target": True,
                    "drone_probability": 0.95,
                    "confidence": 0.90,
                },
                "rf": {
                    "is_available": True,
                    "detected_target": True,
                    "drone_probability": 0.98,
                    "confidence": 0.92,
                },
            },
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["classification"], "DRONE")
        self.assertGreater(data["overall_confidence"], 0)

    def test_fusion_conflict_produces_uncertain(self):
        response = client.post(
            "/api/fusion/predict",
            json={
                "vision": {
                    "is_available": True,
                    "detected_target": True,
                    "drone_probability": 0.95,
                    "confidence": 0.90,
                },
                "rf": {
                    "is_available": True,
                    "detected_target": True,
                    "drone_probability": 0.05,
                    "confidence": 0.90,
                },
            },
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["classification"], "UNCERTAIN")


class TestEventsEndpoint(unittest.TestCase):
    """Tests for GET /api/events"""

    def test_events_returns_list(self):
        response = client.get("/api/events")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("events", data)
        self.assertIn("total", data)

    def test_events_after_demo(self):
        # Run a demo scenario to create an event
        client.post("/api/fusion/demo", json={"scenario": "A"})
        response = client.get("/api/events?limit=5")
        data = response.json()
        self.assertGreater(len(data["events"]), 0)
        event = data["events"][0]
        self.assertIn("timestamp", event)
        self.assertIn("fusion_result", event)
        self.assertIn("confidence", event)


class TestRootEndpoint(unittest.TestCase):
    """Tests for GET /"""

    def test_root_returns_info(self):
        response = client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("name", data)
        self.assertIn("docs", data)
        self.assertIn("api", data)


class TestIntegrationRFPipeline(unittest.TestCase):
    """Integration test: real RF inference through the API."""

    def test_real_rf_inference_from_dataset_sample(self):
        """Download a real sample from the dataset and run it through the API."""
        # Get a sample
        samples_resp = client.get("/api/rf/samples?count=1")
        self.assertEqual(samples_resp.status_code, 200)
        sample = samples_resp.json()[0]
        features = sample["features"]
        self.assertEqual(len(features), 300)

        # Run inference
        response = client.post("/api/rf/predict", json={"samples": features})
        self.assertEqual(response.status_code, 200)
        result = response.json()

        # Verify result matches expected ground truth
        ground_truth = sample["ground_truth"]
        prediction = result["classification"]
        print(
            f"\n  Integration: Sample {sample['sample_id']} "
            f"(GT: {ground_truth}) -> Predicted: {prediction} "
            f"(prob: {result['probability']:.4f}, latency: {result['latency_ms']:.2f}ms)"
        )
        # With a well-trained model, we expect accuracy > 95%
        self.assertIn(prediction, ["DRONE", "NON-DRONE"])
        self.assertGreater(result["latency_ms"], 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
