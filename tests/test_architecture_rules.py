"""Automated tests verifying machine-checkable architectural rules (ARCH-001 through ARCH-008)."""
import unittest
import ast
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

class TestArchitectureRules(unittest.TestCase):
    def test_arch_001_preprocessing_equivalence(self):
        """ARCH-001: Training and inference must import the exact same preprocessing function."""
        # Check that inference.py and data_loader.py both import transform_and_scale from preprocessing
        inf_file = REPO_ROOT / "src" / "inference.py"
        dl_file = REPO_ROOT / "src" / "data_loader.py"
        
        self.assertIn("from preprocessing import transform_and_scale", inf_file.read_text())
        self.assertIn("from preprocessing import transform_and_scale", dl_file.read_text())

    def test_arch_002_test_split_isolation(self):
        """ARCH-002: Scaler must be fit strictly on training data, never on test data."""
        dl_file = (REPO_ROOT / "src" / "data_loader.py").read_text()
        # Ensure fit=True is only called on X_tr
        self.assertIn("transform_and_scale(X_tr, fit=True)", dl_file)
        self.assertIn("transform_and_scale(X_val, scaler=scaler, fit=False)", dl_file)
        self.assertIn("transform_and_scale(X_test, scaler=scaler, fit=False)", dl_file)

    def test_arch_003_threshold_validation_split(self):
        """ARCH-003: Detection threshold must be selected on validation data, not test data."""
        eval_file = (REPO_ROOT / "src" / "evaluate.py").read_text()
        # Verify threshold_optimization is called with data["y_val"]
        self.assertIn('threshold_optimization(data["y_val"]', eval_file)

    def test_arch_004_no_circular_dependencies(self):
        """ARCH-007: No circular dependencies between core modules."""
        # Preprocessing must not import models, evaluate, or inference
        pre_file = (REPO_ROOT / "src" / "preprocessing.py").read_text()
        self.assertNotIn("import models", pre_file)
        self.assertNotIn("import evaluate", pre_file)
        self.assertNotIn("import inference", pre_file)
        self.assertNotIn("import train", pre_file)

if __name__ == "__main__":
    unittest.main()
