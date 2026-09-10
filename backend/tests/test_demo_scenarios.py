"""
test_demo_scenarios.py
Comprehensive End-to-End Verification of Track-A Demo Scenarios in AeroGuard.
"""

import unittest
import time
import json
import urllib.request
import urllib.parse

BASE_URL = "http://127.0.0.1:5000"

def api_get(endpoint):
    req = urllib.request.Request(f"{BASE_URL}{endpoint}")
    with urllib.request.urlopen(req, timeout=10) as response:
        return json.loads(response.read().decode())

def api_post(endpoint, payload=None):
    data = json.dumps(payload or {}).encode('utf-8')
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=10) as response:
        return json.loads(response.read().decode())

class TestTrackADemoScenarios(unittest.TestCase):

    def setUp(self):
        api_post("/api/simulation/reset")
        time.sleep(0.3)

    def tearDown(self):
        api_post("/api/simulation/reset")
        time.sleep(0.2)

    def test_01_authorized_drone(self):
        """Scenario 1: Authorized Drone (DRN-001) should have AUTHORIZED status and 0 active alerts."""
        res = api_post("/api/simulation/scenario", {"scenario": "AUTHORIZED_DRONE", "speed": 1.0})
        self.assertTrue(res.get("success"), "Scenario trigger failed")
        time.sleep(1.0)

        snapshot = api_get("/api/simulation/snapshot").get("snapshot", {})
        track = snapshot.get("current_track", {})
        self.assertEqual(track.get("track_id"), "DRN-001")
        self.assertEqual(track.get("object_type"), "DRONE")
        
        auth = track.get("authorization", {})
        self.assertIn(auth.get("status"), ["AUTHORIZED", "AUTHORISED"])
        
        alerts_res = api_get("/api/alerts")
        active_drn_alerts = [
            a for a in alerts_res.get("alerts", [])
            if a.get("track_id") == "DRN-001" and a.get("status") == "ACTIVE"
        ]
        self.assertEqual(len(active_drn_alerts), 0, f"Expected 0 active alerts for authorized drone, found: {active_drn_alerts}")

    def test_02_unregistered_drone(self):
        """Scenario 2: Unregistered Drone (UNKNOWN-UAS-999) triggers UNREGISTERED alert and HIGH risk."""
        res = api_post("/api/simulation/scenario", {"scenario": "UNREGISTERED_DRONE", "speed": 1.0})
        self.assertTrue(res.get("success"))
        time.sleep(1.2)

        snapshot = api_get("/api/simulation/snapshot").get("snapshot", {})
        track = snapshot.get("current_track", {})
        self.assertEqual(track.get("track_id"), "UNKNOWN-UAS-999")
        
        auth = track.get("authorization", {})
        self.assertIn(auth.get("status"), ["UNAUTHORIZED", "UNREGISTERED"])
        self.assertEqual(track.get("alert_classification"), "UNREGISTERED")

        alerts_res = api_get("/api/alerts")
        unreg_alerts = [
            a for a in alerts_res.get("alerts", [])
            if a.get("track_id") == "UNKNOWN-UAS-999" and a.get("status") == "ACTIVE"
        ]
        self.assertGreaterEqual(len(unreg_alerts), 1, "Expected active alert for unregistered drone")
        self.assertIn("UNREGISTERED", unreg_alerts[0].get("alert_type"))

    def test_03_altitude_violation(self):
        """Scenario 3: Altitude Violation (DRN-001 at 250m) triggers OUT_OF_ENVELOPE / ALTITUDE_ABOVE_MAX."""
        res = api_post("/api/simulation/scenario", {"scenario": "ALTITUDE_VIOLATION", "speed": 1.0})
        self.assertTrue(res.get("success"))
        time.sleep(1.2)

        snapshot = api_get("/api/simulation/snapshot").get("snapshot", {})
        track = snapshot.get("current_track", {})
        self.assertEqual(track.get("track_id"), "DRN-001")
        self.assertGreater(track.get("altitude_m", 0), 200)

        alerts_res = api_get("/api/alerts")
        alt_alerts = [
            a for a in alerts_res.get("alerts", [])
            if a.get("track_id") == "DRN-001" and a.get("status") == "ACTIVE"
        ]
        self.assertGreaterEqual(len(alt_alerts), 1, "Expected altitude violation alert")
        self.assertEqual(alt_alerts[0].get("alert_type"), "OUT_OF_ENVELOPE")
        alert_text = (alt_alerts[0].get("subtype", "") + " " + alt_alerts[0].get("title", "") + " " + alt_alerts[0].get("reason", "")).upper()
        self.assertIn("ALTITUDE", alert_text)

    def test_04_temp_red_zone_violation(self):
        """Scenario 4: Temp Red Zone Violation auto-creates ZONE-TEMP-DEMO and triggers breach alert."""
        res = api_post("/api/simulation/scenario", {"scenario": "TEMP_RED_ZONE_VIOLATION", "speed": 1.0})
        self.assertTrue(res.get("success"))
        time.sleep(1.2)

        zones_res = api_get("/api/zones")
        demo_zones = [z for z in zones_res.get("zones", []) if z.get("zone_id") == "ZONE-TEMP-DEMO"]
        self.assertEqual(len(demo_zones), 1, "Temporary red zone was not created in DB")
        self.assertEqual(demo_zones[0].get("zone_type"), "TEMPORARY_RED")

        alerts_res = api_get("/api/alerts")
        zone_alerts = [
            a for a in alerts_res.get("alerts", [])
            if a.get("track_id") in ["TRACK-INTRUDER-01", "DRN-002"] and a.get("status") == "ACTIVE"
        ]
        self.assertGreaterEqual(len(zone_alerts), 1, "Expected restricted zone breach alert")
        self.assertEqual(zone_alerts[0].get("alert_type"), "OUT_OF_ENVELOPE")

    def test_05_lost_link_watchdog_and_recovery(self):
        """Scenario 5: Lost Link stops transmitting after 4 reports, triggers watchdog timeout, then auto-recovers."""
        res = api_post("/api/simulation/scenario", {"scenario": "LOST_LINK", "speed": 3.0})
        self.assertTrue(res.get("success"))

        time.sleep(3.5)
        alerts_res = api_get("/api/alerts")
        lost_link_alerts = [
            a for a in alerts_res.get("alerts", [])
            if a.get("track_id") in ["RID-004", "DRN-001"] and "LOST_LINK" in a.get("alert_type", "")
        ]
        self.assertGreaterEqual(len(lost_link_alerts), 1, "Watchdog should have triggered LOST_LINK alert")

        time.sleep(3.5)
        snapshot = api_get("/api/simulation/snapshot").get("snapshot", {})
        track = snapshot.get("current_track", {})
        self.assertIn(track.get("display_status"), ["TRACKING", "RECOVERED", "NORMAL", "LOST_LINK", "RADAR + CAMERA CORRELATED"])

    def test_06_sensor_conflict(self):
        """Scenario 6: Sensor Conflict (Radar DRONE vs Vision BIRD) flags VISION_RADAR_CONFLICT."""
        res = api_post("/api/simulation/scenario", {"scenario": "SENSOR_CONFLICT", "speed": 1.0})
        self.assertTrue(res.get("success"))
        time.sleep(1.2)

        snapshot = api_get("/api/simulation/snapshot").get("snapshot", {})
        track = snapshot.get("current_track", {})
        self.assertEqual(track.get("track_id"), "TRACK-CONFLICT-01")
        
        has_conflict = (
            track.get("fusion_status") in ["CONFLICT", "CLASSIFICATION_CONFLICT"] or
            "CONFLICT" in str(track.get("display_status", "")) or
            "CONFLICT" in str(track.get("risk_reasons", [])) or
            track.get("alert_subtype") == "VISION_RADAR_CONFLICT" or
            "CONFLICT" in str(track.get("risk", {}))
        )
        self.assertTrue(has_conflict, f"Expected fusion conflict indication, track: {track}")

    def test_07_multi_object_simultaneous(self):
        """Scenario 7: Multi-Object produces 3 distinct simultaneous tracks on the console."""
        res = api_post("/api/simulation/scenario", {"scenario": "MULTI_OBJECT", "speed": 1.0})
        self.assertTrue(res.get("success"))
        time.sleep(1.5)

        snapshot = api_get("/api/simulation/snapshot").get("snapshot", {})
        active_tracks = snapshot.get("active_tracks", [])
        track_ids = {t.get("track_id") for t in active_tracks}
        
        self.assertIn("DRN-001", track_ids, "DRN-001 missing from active tracks")
        self.assertIn("UNKNOWN-UAS-003", track_ids, "UNKNOWN-UAS-003 missing from active tracks")
        self.assertIn("DRN-002", track_ids, "DRN-002 missing from active tracks")
        self.assertGreaterEqual(len(active_tracks), 3, "Expected at least 3 active tracks")

    def test_08_pause_resume_stop(self):
        """Test pause, resume, and stop controls."""
        api_post("/api/simulation/scenario", {"scenario": "AUTHORIZED_DRONE", "speed": 1.0})
        time.sleep(0.5)

        p_res = api_post("/api/simulation/pause")
        self.assertEqual(p_res.get("state"), "PAUSED")

        r_res = api_post("/api/simulation/resume")
        self.assertEqual(r_res.get("state"), "RUNNING")

        s_res = api_post("/api/simulation/stop")
        self.assertEqual(s_res.get("state"), "STOPPED")

    def test_09_reset_cleans_baseline(self):
        """Test RESET clears demo tracks, removes temporary demo zones, and restores clean baseline."""
        api_post("/api/simulation/scenario", {"scenario": "TEMP_RED_ZONE_VIOLATION", "speed": 1.0})
        time.sleep(1.0)

        reset_res = api_post("/api/simulation/reset")
        self.assertTrue(reset_res.get("success"))
        time.sleep(0.5)

        snapshot = api_get("/api/simulation/snapshot").get("snapshot", {})
        self.assertEqual(snapshot.get("state"), "STOPPED")
        self.assertEqual(len(snapshot.get("active_tracks", [])), 0)

        zones_res = api_get("/api/zones")
        demo_zones = [z for z in zones_res.get("zones", []) if z.get("zone_id") == "ZONE-TEMP-DEMO"]
        self.assertEqual(len(demo_zones), 0, "Temporary demo zone was not cleaned up on reset")

    def test_10_alert_deduplication(self):
        """Test alert deduplication: continuous telemetry updates update coordinates without duplicate spam."""
        api_post("/api/simulation/scenario", {"scenario": "ALTITUDE_VIOLATION", "speed": 2.0})
        time.sleep(2.5)

        alerts_res = api_get("/api/alerts")
        active_alt_alerts = [
            a for a in alerts_res.get("alerts", [])
            if a.get("track_id") == "DRN-001" and a.get("status") == "ACTIVE"
        ]
        self.assertEqual(len(active_alt_alerts), 1, f"Expected exactly 1 active deduplicated alert, found: {len(active_alt_alerts)}")

if __name__ == "__main__":
    unittest.main(verbosity=2)
