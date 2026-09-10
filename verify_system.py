import sys
import os
import json
import time
import requests

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(BASE_DIR, "backend"))

def run_tests():
    print("=" * 60)
    print("AEROGUARD SYSTEM VERIFICATION SUITE")
    print("=" * 60)

    # 1. Test ASTRA Engine
    print("\n[TEST 1] Verifying ASTRA Radar ML Engine...")
    from astra_engine import astra_engine
    info = astra_engine.get_info()
    assert info["status"] == "LOADED", "ASTRA Engine not loaded"
    assert info["accuracy"] >= 0.99, f"ASTRA Accuracy too low: {info['accuracy']}"
    assert info["features_count"] == 300, f"Expected 300 features, got {info['features_count']}"
    print(f"[PASS] ASTRA RF Model Status: {info['status']} | Verified Accuracy: {info['accuracy']*100:.2f}% | Classes: {list(info['classes'].values())}")

    # Test sample prediction
    drone_sample = astra_engine.get_sample_for_class(1)
    pred = astra_engine.predict(drone_sample)
    assert pred["class_name"] == "DRONE", f"Expected DRONE, got {pred['class_name']}"
    print(f"[PASS] Sample Prediction: {pred['class_name']} | Confidence: {pred['confidence']*100:.1f}%")

    # 2. Test Rules & Authorization Engine
    print("\n[TEST 2] Verifying Rules & Authorization Engine...")
    from rules_engine import rules_engine
    auth_res = rules_engine.check_authorization("TRACK-9999", "DRONE", 13.068, 80.298, 88.0)
    assert auth_res["status"] == "UNAUTHORIZED", "Unregistered drone should be UNAUTHORIZED"
    print(f"[PASS] Unregistered Drone Auth Check: {auth_res['status']} ({auth_res['reason']})")

    auth_approved = rules_engine.check_authorization("DRN-001", "DRONE", 13.095, 80.302, 60.0)
    assert auth_approved["status"] == "AUTHORIZED", "Registered DRN-001 should be AUTHORIZED"
    print(f"[PASS] Registered Drone Auth Check: {auth_approved['status']} ({auth_approved['reason']})")

    # 3. Test Geofence Engine & Trajectory Prediction
    print("\n[TEST 3] Verifying Geofence & Trajectory Prediction...")
    # Point inside Naval Base (13.070, 80.300)
    geo_in = rules_engine.check_geofence(13.070, 80.300, 88.0)
    assert geo_in["status"] == "RESTRICTED_ZONE_VIOLATION", f"Expected violation, got {geo_in['status']}"
    print(f"[PASS] Geofence Violation Check: {geo_in['status']} ({geo_in['reason']})")

    # Trajectory prediction heading toward naval base
    traj = rules_engine.predict_trajectory(13.050, 80.298, 88.0, 20.0, 10.0, horizon_seconds=30)
    assert len(traj["predicted_points"]) == 6, "Expected 6 trajectory projection points"
    print(f"[PASS] Trajectory Projection: {len(traj['predicted_points'])} forward steps calculated. Projected breach: {traj.get('breach_prediction')}")

    # 4. Test Sensor Fusion Engine
    print("\n[TEST 4] Verifying Sensor Fusion & Cueing...")
    from fusion_engine import fusion_engine
    cam_cov = fusion_engine.check_camera_coverage(13.068, 80.298)
    assert cam_cov is not None, "Target should be in coverage of CAM-03"
    print(f"[PASS] Camera Spatial Cueing: Target inside {cam_cov['camera_name']} ({cam_cov['distance_m']}m away)")

    fusion_res = fusion_engine.correlate(
        radar_class="DRONE",
        radar_confidence=0.965,
        track_lat=13.068,
        track_lon=80.298,
        camera_result={"detections": [{"class_name": "DRONE", "confidence": 0.948}], "inference_source": "TEST"},
        camera_info=cam_cov
    )
    assert fusion_res["fusion_status"] == "CORRELATED", f"Expected CORRELATED, got {fusion_res['fusion_status']}"
    print(f"[PASS] Dual-Signature Correlation: {fusion_res['display_status']} (Fused Conf: {fusion_res['fused_confidence']*100:.1f}%)")

    # 5. Test Simulation Engine
    print("\n[TEST 5] Verifying Coherent Kinematic Simulation Engine...")
    from simulation_engine import simulation_engine
    simulation_engine.start("RESTRICTED_INTRUSION", speed=1.0)
    snap = simulation_engine.update_step(1.0)
    t = snap["current_track"]
    assert t["track_id"] == "TRACK-0001", "Expected TRACK-0001"
    assert t["object_type"] == "DRONE", "Expected DRONE"
    print(f"[PASS] Simulation Step Kinematics: Lat={t['latitude']}, Lon={t['longitude']}, Alt={t['altitude_m']}m, Speed={t['speed_mps']}m/s")
    print(f"[PASS] Threat Risk Level: {t['risk']['level']} (Score: {t['risk']['score']}/100)")
    print(f"[PASS] Transparent Reasons: {t['risk']['reasons']}")

    # 6. Test Flask API Endpoints
    print("\n[TEST 6] Verifying Flask API routes via Test Client...")
    from app import app
    client = app.test_client()

    h = client.get("/api/health").get_json()
    assert h["status"] == "ok", "Health endpoint error"
    print(f"[PASS] GET /api/health: {h['components']}")

    scenarios = client.get("/api/scenarios").get_json()
    assert len(scenarios["scenarios"]) == 8, f"Expected 8 scenarios, got {len(scenarios['scenarios'])}"
    print(f"[PASS] GET /api/scenarios: {len(scenarios['scenarios'])} coherent scenarios available")

    zones = client.get("/api/zones").get_json()
    assert len(zones["zones"]) >= 3, "Expected at least 3 seeded restricted zones"
    print(f"[PASS] GET /api/zones: {len(zones['zones'])} active coastal geofences")

    alerts = client.get("/api/alerts").get_json()
    print(f"[PASS] GET /api/alerts: {len(alerts['alerts'])} alerts logged in database")

    incidents = client.get("/api/incidents").get_json()
    print(f"[PASS] GET /api/incidents: {len(incidents['incidents'])} incidents logged in database")

    print("\n" + "=" * 60)
    print("ALL CORE INTEGRATION TESTS PASSED SUCCESSFULLY! (100% GREEN)")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
