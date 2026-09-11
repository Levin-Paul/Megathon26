"""Unit tests for RF input validation and error handling."""
import unittest
import numpy as np
import sys
from pathlib import Path

# Add src to sys.path
SRC_DIR = Path(__file__).resolve().parent.parent / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from inference import RFInferenceEngine, predict_drone
from preprocessing import raw_to_complex_baseband, transform_and_scale, TOTAL_RAW_FEATURES

class TestRFInputValidation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = RFInferenceEngine()

    def test_valid_300_features_array(self):
        """Standard valid input of exactly 300 float features."""
        valid_input = np.random.randn(300)
        result = self.engine.predict(valid_input)
        self.assertIn(result["classification"], ["DRONE", "NON-DRONE"])
        self.assertIsInstance(result["probability"], float)
        self.assertGreaterEqual(result["probability"], 0.0)
        self.assertLessEqual(result["probability"], 1.0)
        self.assertEqual(result["features_processed"], 300)

    def test_valid_dict_input(self):
        """Valid input formatted as dictionary."""
        valid_dict = {str(i): float(np.random.randn()) for i in range(300)}
        result = self.engine.predict(valid_dict)
        self.assertIn(result["classification"], ["DRONE", "NON-DRONE"])

    def test_valid_dict_features_key(self):
        """Valid input formatted as dict with 'features' key."""
        valid_dict = {"features": list(np.random.randn(300))}
        result = self.engine.predict(valid_dict)
        self.assertIn(result["classification"], ["DRONE", "NON-DRONE"])

    def test_too_few_features_raises_error(self):
        """Input with < 300 features must raise ValueError."""
        short_input = np.random.randn(250)
        with self.assertRaises(ValueError) as ctx:
            self.engine.predict(short_input)
        self.assertIn("300", str(ctx.exception))

    def test_too_many_features_raises_error(self):
        """Input with > 300 features must raise ValueError."""
        long_input = np.random.randn(350)
        with self.assertRaises(ValueError) as ctx:
            self.engine.predict(long_input)
        self.assertIn("300", str(ctx.exception))

    def test_nan_values_rejected(self):
        """Input containing NaN must raise ValueError."""
        nan_input = np.random.randn(300)
        nan_input[42] = np.nan
        with self.assertRaises(ValueError) as ctx:
            self.engine.predict(nan_input)
        self.assertTrue("NaN" in str(ctx.exception) or "finite" in str(ctx.exception))

    def test_inf_values_rejected(self):
        """Input containing Inf must raise ValueError."""
        inf_input = np.random.randn(300)
        inf_input[10] = np.inf
        with self.assertRaises(ValueError) as ctx:
            self.engine.predict(inf_input)
        self.assertTrue("infinite" in str(ctx.exception) or "finite" in str(ctx.exception))

    def test_empty_input_rejected(self):
        """Empty input must raise ValueError."""
        with self.assertRaises(ValueError):
            self.engine.predict([])

if __name__ == "__main__":
    unittest.main()
