"""Unit tests for RF preprocessing and feature representation."""
import unittest
import numpy as np
import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parent.parent / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from preprocessing import (
    raw_to_complex_baseband,
    extract_rf_features,
    transform_and_scale,
    SEQ_LEN,
    RAW_CHANNELS,
    FEATURE_CHANNELS,
    TOTAL_RAW_FEATURES,
)

class TestPreprocessing(unittest.TestCase):
    def test_complex_baseband_conversion(self):
        """Verify interleaved I/Q mapping to complex array."""
        # 150 pairs: I = 1.0, Q = 2.0
        raw = np.tile([1.0, 2.0], SEQ_LEN).astype(np.float64)
        z = raw_to_complex_baseband(raw)
        self.assertEqual(z.shape, (1, 150))
        self.assertTrue(np.allclose(np.real(z), 1.0))
        self.assertTrue(np.allclose(np.imag(z), 2.0))

    def test_feature_extraction_properties(self):
        """Verify feature extraction: log_magnitude, cos_phase, sin_phase."""
        # Create pure carrier with known amplitude 2.0 and phase pi/4
        # I = 2 * cos(pi/4) = sqrt(2), Q = 2 * sin(pi/4) = sqrt(2)
        I_val = np.sqrt(2)
        Q_val = np.sqrt(2)
        z = np.full((1, 150), I_val + 1j * Q_val, dtype=np.complex128)
        feats = extract_rf_features(z)
        self.assertEqual(feats.shape, (1, 150, 3))
        
        # Channel 0: log(magnitude) = log(2.0)
        expected_log_mag = np.log(2.0)
        self.assertTrue(np.allclose(feats[0, :, 0], expected_log_mag, atol=1e-5))
        
        # Channel 1: cos(phase) = cos(pi/4) = sqrt(2)/2 ~= 0.7071
        self.assertTrue(np.allclose(feats[0, :, 1], np.cos(np.pi / 4), atol=1e-5))
        
        # Channel 2: sin(phase) = sin(pi/4) = sqrt(2)/2 ~= 0.7071
        self.assertTrue(np.allclose(feats[0, :, 2], np.sin(np.pi / 4), atol=1e-5))
        
        # Unit vector property: cos^2 + sin^2 == 1
        unit_norm = feats[0, :, 1]**2 + feats[0, :, 2]**2
        self.assertTrue(np.allclose(unit_norm, 1.0, atol=1e-5))

    def test_zero_magnitude_stability(self):
        """Verify numerical stability when signal magnitude is zero (log(0) avoidance)."""
        z_zero = np.zeros((1, 150), dtype=np.complex128)
        feats = extract_rf_features(z_zero)
        self.assertFalse(np.any(np.isnan(feats)))
        self.assertFalse(np.any(np.isinf(feats)))
        # Safe log should clamp to log(1e-8) ~= -18.42
        self.assertTrue(np.allclose(feats[0, :, 0], np.log(1e-8), atol=1e-4))

    def test_train_inference_scaler_parity(self):
        """ARCH-001: Preprocessing transformation must be deterministic and identical."""
        raw = np.random.randn(10, TOTAL_RAW_FEATURES)
        # Fit scaler on raw
        scaled_train, scaler = transform_and_scale(raw, fit=True)
        # Transform single sample using fitted scaler
        single_sample = raw[0:1]
        scaled_eval, _ = transform_and_scale(single_sample, scaler=scaler, fit=False)
        self.assertTrue(np.allclose(scaled_train[0], scaled_eval[0], atol=1e-6))

if __name__ == "__main__":
    unittest.main()
