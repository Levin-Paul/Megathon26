"""Unit tests for model artifacts, configuration integrity, and parameter bounds."""
import unittest
import json
import torch
from pathlib import Path
import sys

SRC_DIR = Path(__file__).resolve().parent.parent / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from models import DroneCNNv2, BaselineLogistic, model_param_count

class TestModelArtifacts(unittest.TestCase):
    def setUp(self):
        self.models_dir = Path(__file__).resolve().parent.parent / "models"
        self.cfg_path = self.models_dir / "config.json"
        self.cnn_path = self.models_dir / "drone_detector.pt"
        self.baseline_path = self.models_dir / "baseline.pt"
        self.scaler_path = self.models_dir / "preprocessing.joblib"

    def test_artifacts_exist(self):
        """Verify that all required model artifacts are persisted."""
        self.assertTrue(self.cfg_path.exists(), "models/config.json missing")
        self.assertTrue(self.cnn_path.exists(), "models/drone_detector.pt missing")
        self.assertTrue(self.baseline_path.exists(), "models/baseline.pt missing")
        self.assertTrue(
            self.scaler_path.exists() or (self.models_dir / "preprocessing.pkl").exists(),
            "Scaler artifact missing"
        )

    def test_config_contract(self):
        """Verify configuration structure and required keys without deprecated fallbacks."""
        cfg = json.loads(self.cfg_path.read_text())
        self.assertIn("dataset", cfg)
        self.assertIn("model", cfg)
        self.assertIn("preprocessing", cfg)
        self.assertIn("best_by_val_roc_auc", cfg["model"])
        # Ensure no typo key exists
        self.assertNotIn("best_by_val_val_roc_auc", cfg["model"])
        self.assertIn(cfg["model"]["best_by_val_roc_auc"], ["baseline", "cnn"])
        self.assertIn("detection_threshold", cfg)
        self.assertGreater(cfg["detection_threshold"], 0.0)
        self.assertLess(cfg["detection_threshold"], 1.0)

    def test_checkpoint_deserialization(self):
        """Verify PyTorch checkpoints load with expected state dicts."""
        cnn_ckpt = torch.load(self.cnn_path, map_location="cpu", weights_only=False)
        self.assertEqual(cnn_ckpt.get("model_type"), "DroneCNNv2")
        self.assertIn("state_dict", cnn_ckpt)
        
        base_ckpt = torch.load(self.baseline_path, map_location="cpu", weights_only=False)
        self.assertEqual(base_ckpt.get("model_type"), "BaselineLogistic")
        self.assertIn("state_dict", base_ckpt)

    def test_cnn_architecture_parameter_count(self):
        """Verify DroneCNNv2 parameter count matches expected compact architecture."""
        cnn = DroneCNNv2(seq_len=150, n_channels=3)
        params = model_param_count(cnn)
        self.assertEqual(params, 14241)
        
        # Test forward pass with dummy input (Batch, Timesteps, Channels)
        dummy = torch.randn(2, 150, 3)
        out = cnn(dummy)
        self.assertEqual(out.shape, (2, 1))

    def test_baseline_architecture_parameter_count(self):
        """Verify BaselineLogistic parameter count for 450 flattened features."""
        base = BaselineLogistic(input_dim=450)
        params = model_param_count(base)
        self.assertEqual(params, 451) # 450 weights + 1 bias
        
        dummy = torch.randn(2, 150, 3)
        out = base(dummy)
        self.assertEqual(out.shape, (2, 1))

if __name__ == "__main__":
    unittest.main()
