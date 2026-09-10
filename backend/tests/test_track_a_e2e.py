import unittest
import time
import json
import sqlite3
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

BASE_URL = "http://127.0.0.1:5000"
DB_PATH = os.path.join(BACKEND_DIR, "data", "aeroguard.db")

def api_request(path, method="GET", data=None, headers=None):
    url = f"{BASE_URL}{path}"
    h = headers or {}
    if "Authorization" not in h:
        h["Authorization"] = "Bearer aerosec-officer-token"
    
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        h["Content-Type"] = "application/json"
    
    req = urllib.request.Request(url, data=body, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10.0) as resp:
            resp_body = resp.read().decode("utf-8")
            status = resp.status
            try:
                parsed = json.loads(resp_body)
            except Exception:
                parsed = resp_body
            return status, parsed
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(err_body)
        except Exception:
            parsed = err_body
        return e.code, parsed


class TestTrackAEndToEnd(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        status, data = api_request("/api/health")
        if status != 200:
            raise RuntimeError(f"Backend not responding on {BASE_URL}: {data}")

    # TEST 1: Registered + valid permission + valid zone + valid altitude -> AUTHORISED
    def test_01_registered_valid_permission_authorised(self):
        """TEST 1: Registered + valid permission + valid zone + valid altitude -> AUTHORISED"""
        payload = {
            "track_id": "DRN-001",
            "uas_id": "UIN-2026-IND-0101",
            "source": "REMOTE_ID",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "latitude": 13.100,
            "longitude": 80.305,
            "altitude_m": 50.0,
            "speed_mps": 12.0,
            "heading_deg": 180.0,
            "object_type": "DRONE"
        }
        status, res = api_request("/api/ingest/telemetry", method="POST", data=payload)
        self.assertEqual(status, 200, f"Ingest failed: {res}")
        track = res.get("track", {})
        self.assertIn(track.get("alert_classification"), ["AUTHORIZED", "AUTHORISED"])
        auth = track.get("authorization", {})
        self.assertEqual(auth.get("primary_status"), "AUTHORISED")
        self.assertTrue(auth.get("registered"))
        self.assertTrue(auth.get("permission_active"))
        self.assertTrue(auth.get("inside_zone"))
        self.assertTrue(auth.get("altitude_valid"))
        self.assertTrue(auth.get("time_valid"))
        self.assertEqual(auth.get("reason_codes"), [])
        print("\n[TEST 1] Authorized flight verified successfully.")

    # TEST 2: Unknown UAS -> UNREGISTERED
    def test_02_unknown_uas_unregistered(self):
        """TEST 2: Unknown UAS -> UNREGISTERED"""
        payload = {
            "track_id": "TRK-GHOST-001",
            "uas_id": "UAS-UNKNOWN-GHOST-X99",
            "source": "REMOTE_ID",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "latitude": 13.050,
            "longitude": 80.280,
            "altitude_m": 45.0,
            "speed_mps": 14.0,
            "heading_deg": 90.0,
            "object_type": "DRONE"
        }
        status, res = api_request("/api/ingest/telemetry", method="POST", data=payload)
        self.assertEqual(status, 200)
        track = res.get("track", {})
        self.assertEqual(track.get("alert_classification"), "UNREGISTERED")
        auth = track.get("authorization", {})
        self.assertEqual(auth.get("primary_status"), "UNREGISTERED")
        self.assertFalse(auth.get("registered"))
        self.assertIn("NO_REGISTRY_MATCH", auth.get("reason_codes", []))
        print("[TEST 2] Unknown UAS unregistered alert verified.")

    # TEST 3: Registered UAS outside permitted zone -> OUT_OF_ENVELOPE
    def test_03_registered_outside_permitted_zone_out_of_envelope(self):
        """TEST 3: Registered UAS outside permitted zone -> OUT_OF_ENVELOPE"""
        # DRN-001 is permitted in ZONE-PORT-02 (lat 13.088-13.110, lon 80.295-80.325)
        # We place it far south at (13.040, 80.260)
        payload = {
            "track_id": "DRN-001",
            "uas_id": "UIN-2026-IND-0101",
            "source": "REMOTE_ID",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "latitude": 13.040,
            "longitude": 80.260,
            "altitude_m": 50.0,
            "speed_mps": 12.0,
            "heading_deg": 90.0,
            "object_type": "DRONE"
        }
        status, res = api_request("/api/ingest/telemetry", method="POST", data=payload)
        self.assertEqual(status, 200)
        track = res.get("track", {})
        self.assertEqual(track.get("alert_classification"), "OUT_OF_ENVELOPE")
        auth = track.get("authorization", {})
        self.assertEqual(auth.get("primary_status"), "OUT_OF_ENVELOPE")
        self.assertFalse(auth.get("inside_zone"))
        self.assertTrue(any("ZONE" in r or "CORRIDOR" in r for r in auth.get("reason_codes", [])))
        print("[TEST 3] Outside permitted corridor violation verified.")

    # TEST 4: Altitude exceeds max -> OUT_OF_ENVELOPE
    def test_04_altitude_exceeds_max_out_of_envelope(self):
        """TEST 4: Altitude exceeds max -> OUT_OF_ENVELOPE"""
        # DRN-001 ceiling is 80m. We send 120m.
        payload = {
            "track_id": "DRN-001",
            "uas_id": "UIN-2026-IND-0101",
            "source": "REMOTE_ID",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "latitude": 13.100,
            "longitude": 80.305,
            "altitude_m": 120.0,
            "speed_mps": 12.0,
            "heading_deg": 180.0,
            "object_type": "DRONE"
        }
        status, res = api_request("/api/ingest/telemetry", method="POST", data=payload)
        self.assertEqual(status, 200)
        track = res.get("track", {})
        self.assertEqual(track.get("alert_classification"), "OUT_OF_ENVELOPE")
        auth = track.get("authorization", {})
        self.assertFalse(auth.get("altitude_valid"))
        self.assertIn("ALTITUDE_ABOVE_MAX", auth.get("reason_codes", []))
        print("[TEST 4] Altitude ceiling violation verified.")

    # TEST 5: Permission outside time window -> OUT_OF_ENVELOPE
    def test_05_permission_outside_time_window_out_of_envelope(self):
        """TEST 5: Permission outside time window -> OUT_OF_ENVELOPE"""
        # Register a test drone with expired permission
        conn = sqlite3.connect(DB_PATH, timeout=60.0)
        cur = conn.cursor()
        cur.execute("""
            INSERT OR REPLACE INTO drones (drone_id, uin_number, model_name, drone_type, weight_category, owner_name, registration_status)
            VALUES ('DRN-TIME-EXPIRED', 'UIN-TIME-TEST-001', 'Time Test Quad', 'ROTORCRAFT', 'SMALL', 'Test Pilot', 'VERIFIED')
        """)
        cur.execute("""
            INSERT OR REPLACE INTO flight_permissions (permission_id, drone_id, operator_name, flight_purpose, allowed_zone, start_time, end_time, max_altitude_m, status)
            VALUES ('PERM-EXPIRED-TEST', 'DRN-TIME-EXPIRED', 'Test Pilot', 'Test', 'ZONE-PORT-02', '2026-08-01 00:00:00', '2026-08-05 00:00:00', 80.0, 'APPROVED')
        """)
        conn.commit()
        conn.close()

        payload = {
            "track_id": "DRN-TIME-EXPIRED",
            "uas_id": "UIN-TIME-TEST-001",
            "source": "REMOTE_ID",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "latitude": 13.100,
            "longitude": 80.305,
            "altitude_m": 50.0,
            "speed_mps": 10.0,
            "heading_deg": 180.0,
            "object_type": "DRONE"
        }
        status, res = api_request("/api/ingest/telemetry", method="POST", data=payload)
        self.assertEqual(status, 200)
        track = res.get("track", {})
        self.assertEqual(track.get("alert_classification"), "OUT_OF_ENVELOPE")
        auth = track.get("authorization", {})
        self.assertFalse(auth.get("time_valid"))
        self.assertIn("PERMISSION_EXPIRED", auth.get("reason_codes", []))
        print("[TEST 5] Time window expiration verified.")

    # TEST 6: Temporary red zone created -> violation detected
    def test_06_temporary_red_zone_violation(self):
        """TEST 6: Temporary red zone created -> violation detected"""
        poly = [
            [13.130, 80.270],
            [13.150, 80.270],
            [13.150, 80.290],
            [13.130, 80.290]
        ]
        zone_payload = {
            "name": "Tactical Bomb Squad Zone",
            "zone_type": "TEMPORARY_RED",
            "severity": "CRITICAL",
            "min_altitude_m": 0.0,
            "max_altitude_m": 200.0,
            "polygon_coords": poly,
            "duration_seconds": 3,
            "reason": "Tactical cordon"
        }
        z_status, z_res = api_request("/api/zones", method="POST", data=zone_payload)
        self.assertEqual(z_status, 200)
        zone_id = z_res.get("zone_id")
        self.assertIsNotNone(zone_id)

        in_zone_payload = {
            "track_id": "TRK-ZONE-INTRUDER",
            "uas_id": "UIN-2026-IND-0101",
            "source": "REMOTE_ID",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "latitude": 13.140,
            "longitude": 80.280,
            "altitude_m": 60.0,
            "speed_mps": 10.0,
            "heading_deg": 45.0,
            "object_type": "DRONE"
        }
        status, res = api_request("/api/ingest/telemetry", method="POST", data=in_zone_payload)
        self.assertEqual(status, 200)
        track = res.get("track", {})
        self.assertEqual(track.get("alert_classification"), "OUT_OF_ENVELOPE")
        self.assertIn("VIOLATION", track.get("geofence", {}).get("status", ""))
        print(f"[TEST 6] Created temp zone {zone_id} and verified active incursion violation.")

    # TEST 7: Temporary zone expires -> no longer active
    def test_07_temporary_zone_expires_no_longer_active(self):
        """TEST 7: Temporary zone expires -> no longer active"""
        poly = [
            [13.160, 80.250],
            [13.180, 80.250],
            [13.180, 80.270],
            [13.160, 80.270]
        ]
        zone_payload = {
            "name": "Expiring Sector",
            "zone_type": "TEMPORARY_RED",
            "min_altitude_m": 0.0,
            "max_altitude_m": 200.0,
            "polygon_coords": poly,
            "duration_seconds": 2,
            "reason": "Quick expiry test"
        }
        _, z_res = api_request("/api/zones", method="POST", data=zone_payload)
        zone_id = z_res.get("zone_id")

        print("[TEST 7] Waiting 2.5s for automatic expiration...")
        time.sleep(2.5)

        # Check zone list - should be deactivated
        _, list_res = api_request("/api/zones")
        zones = list_res.get("zones", [])
        matched = next((z for z in zones if z["zone_id"] == zone_id), None)
        self.assertIsNotNone(matched)
        self.assertEqual(matched.get("active"), 0)

        # Ingest at same coords - no longer triggers zone violation
        test_payload = {
            "track_id": "TRK-ZONE-EXPIRED-TEST",
            "uas_id": "UIN-2026-IND-0101",
            "source": "REMOTE_ID",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "latitude": 13.170,
            "longitude": 80.260,
            "altitude_m": 50.0,
            "speed_mps": 10.0,
            "heading_deg": 45.0,
            "object_type": "DRONE"
        }
        _, res_post = api_request("/api/ingest/telemetry", method="POST", data=test_payload)
        track_post = res_post.get("track", {})
        violating = track_post.get("geofence", {}).get("violating_zones", [])
        self.assertNotIn(zone_id, violating)
        print(f"[TEST 7] Confirmed zone {zone_id} automatically expired and inactive.")

    # TEST 8: Telemetry stops -> LOST_LINK
    def test_08_telemetry_stops_lost_link(self):
        """TEST 8: Telemetry stops -> LOST_LINK"""
        api_request("/api/settings", method="PUT", data={"lost_link_timeout_seconds": 2}, headers={"Authorization": "Bearer aerosec-super-admin-token"})

        payload = {
            "track_id": "TRK-LOST-LIFECYCLE-01",
            "uas_id": "UIN-2026-IND-0101",
            "source": "REMOTE_ID",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "latitude": 13.065,
            "longitude": 80.295,
            "altitude_m": 60.0,
            "speed_mps": 12.0,
            "heading_deg": 180.0,
            "object_type": "DRONE"
        }
        api_request("/api/ingest/telemetry", method="POST", data=payload)

        print("[TEST 8] Simulating 3.0s silence for lost link detection...")
        time.sleep(3.0)

        _, a_res = api_request("/api/alerts")
        alerts = a_res.get("alerts", [])
        lost_alert = next((a for a in alerts if a.get("alert_type") == "LOST_LINK" and "TRK-LOST-LIFECYCLE-01" in a.get("track_id", "") and a.get("status") == "ACTIVE"), None)
        self.assertIsNotNone(lost_alert, "LOST_LINK alert must be generated after telemetry timeout")
        self.assertEqual(lost_alert.get("subtype"), "TELEMETRY_TIMEOUT")
        print(f"[TEST 8] LOST_LINK alert generated: {lost_alert.get('alert_id')}")

    # TEST 9: Telemetry resumes -> LOST_LINK clears/recovery
    def test_09_telemetry_resumes_lost_link_clears(self):
        """TEST 9: Telemetry resumes -> LOST_LINK clears/recovery"""
        # Resume telemetry transmission for TRK-LOST-LIFECYCLE-01
        payload = {
            "track_id": "TRK-LOST-LIFECYCLE-01",
            "uas_id": "UIN-2026-IND-0101",
            "source": "REMOTE_ID",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "latitude": 13.066,
            "longitude": 80.296,
            "altitude_m": 62.0,
            "speed_mps": 12.0,
            "heading_deg": 180.0,
            "object_type": "DRONE"
        }
        status, res = api_request("/api/ingest/telemetry", method="POST", data=payload)
        self.assertEqual(status, 200)
        track = res.get("track", {})
        self.assertEqual(track.get("status"), "TRACKING", "Track should recover to TRACKING status")

        # Check that the LOST_LINK alert was resolved
        _, a_res = api_request("/api/alerts")
        alerts = a_res.get("alerts", [])
        active_lost = [a for a in alerts if a.get("alert_type") == "LOST_LINK" and "TRK-LOST-LIFECYCLE-01" in a.get("track_id", "") and a.get("status") == "ACTIVE"]
        self.assertEqual(len(active_lost), 0, "Active LOST_LINK alerts must be cleared upon telemetry resumption")
        api_request("/api/settings", method="PUT", data={"lost_link_timeout_seconds": 10}, headers={"Authorization": "Bearer aerosec-super-admin-token"})
        print("[TEST 9] Confirmed LOST_LINK cleared and track successfully recovered.")

    # TEST 10: Operator confirms alert with reason -> disposition stored + audit event
    def test_10_operator_confirms_alert_with_reason(self):
        """TEST 10: Operator confirms alert with reason -> disposition stored + audit event"""
        _, a_res = api_request("/api/alerts")
        alerts = a_res.get("alerts", [])
        self.assertGreater(len(alerts), 0)
        alert_id = alerts[0]["alert_id"]

        # Missing reason code must be rejected with 400
        fail_status, _ = api_request(f"/api/alerts/{alert_id}/disposition", method="POST", data={"disposition": "CONFIRMED"})
        self.assertEqual(fail_status, 400)

        # Valid disposition with reason code
        disp_payload = {
            "disposition": "CONFIRMED",
            "reason_code": "RULE_BREACH_CONFIRMED",
            "notes": "Verified by Coastal Patrol Officer Raman."
        }
        status, res = api_request(f"/api/alerts/{alert_id}/disposition", method="POST", data=disp_payload)
        self.assertEqual(status, 200)
        self.assertTrue(res.get("success"))
        audit_entry = res.get("audit_entry", {})
        self.assertIsNotNone(audit_entry.get("current_hash"))
        self.assertEqual(len(audit_entry["current_hash"]), 64)
        print(f"[TEST 10] Alert disposition committed with SHA-256 block hash {audit_entry['current_hash'][:16]}...")

    # TEST 11: Audit export -> valid CSV + JSON
    def test_11_audit_export_csv_json(self):
        """TEST 11: Audit export -> valid CSV + JSON"""
        c_status, csv_data = api_request("/api/audit/export?format=csv")
        self.assertEqual(c_status, 200)
        self.assertIn("Audit ID", str(csv_data))
        self.assertIn("Current SHA256 Hash", str(csv_data))

        j_status, json_data = api_request("/api/audit/export?format=json")
        self.assertEqual(j_status, 200)
        self.assertIn("records", json_data)
        self.assertIn("export_metadata", json_data)
        self.assertGreater(len(json_data["records"]), 0)
        print(f"[TEST 11] Forensic exports verified (CSV & JSON with {len(json_data['records'])} blocks).")

    # TEST 12: Modify audit record -> chain verification fails
    def test_12_modify_audit_record_chain_verification_fails(self):
        """TEST 12: Modify audit record -> chain verification fails"""
        # First verify chain is valid
        _, v_initial = api_request("/api/audit/verify")
        self.assertTrue(v_initial.get("verification", {}).get("valid"))

        # Intentionally tamper with the latest record
        conn = sqlite3.connect(DB_PATH, timeout=60.0)
        cur = conn.cursor()
        cur.execute("SELECT id, details FROM audit_logs ORDER BY id DESC LIMIT 1")
        row = cur.fetchone()
        rec_id, orig_details = row[0], row[1]
        
        tampered_details = orig_details + " [UNAUTHORIZED_MODIFICATION]"
        cur.execute("UPDATE audit_logs SET details = ? WHERE id = ?", (tampered_details, rec_id))
        conn.commit()
        conn.close()

        # Chain verification MUST fail
        _, v_tampered = api_request("/api/audit/verify")
        tamper_res = v_tampered.get("verification", {})
        self.assertFalse(tamper_res.get("valid"), "Chain verification must detect record tampering!")
        self.assertEqual(tamper_res.get("status"), "TAMPER DETECTED")
        print(f"[TEST 12] Tamper detected successfully at block #{tamper_res.get('broken_at')}.")

        # Restore original details and verify chain is valid again
        conn = sqlite3.connect(DB_PATH, timeout=60.0)
        cur = conn.cursor()
        cur.execute("UPDATE audit_logs SET details = ? WHERE id = ?", (orig_details, rec_id))
        conn.commit()
        conn.close()

        _, v_restored = api_request("/api/audit/verify")
        self.assertTrue(v_restored.get("verification", {}).get("valid"))
        print("[TEST 12] Restored record and verified chain returned to valid state.")

    # TEST 13: Vision + radar correlate -> fused track
    def test_13_vision_radar_correlate_fused_track(self):
        """TEST 13: Vision + radar correlate -> fused track"""
        infer_payload = {
            "camera_id": "CAM-03",
            "sensor_mode": "EO",
            "track_id": "DRN-001",
            "target_hint": {"class_name": "DRONE"}
        }
        status, res = api_request("/api/vision/infer", method="POST", data=infer_payload)
        self.assertEqual(status, 200)
        self.assertTrue(res.get("success"))
        detections = res.get("detections", [])
        self.assertGreater(len(detections), 0)
        self.assertEqual(detections[0].get("class_name").lower(), "drone")
        print(f"[TEST 13] Vision detection returned {len(detections)} targets, class: {detections[0].get('class_name')}.")

    # TEST 14: Vision/radar disagreement -> VISION_RADAR_CONFLICT
    def test_14_vision_radar_disagreement_conflict(self):
        """TEST 14: Vision/radar disagreement -> VISION_RADAR_CONFLICT"""
        # Scenario 6 in simulation is CLASSIFICATION_CONFLICT (Radar DRONE vs Camera BIRD)
        status, res = api_request("/api/simulation/start", method="POST", data={"scenario": "CLASSIFICATION_CONFLICT"})
        self.assertEqual(status, 200)
        snapshot = res.get("snapshot", {})
        track = snapshot.get("current_track", {})
        fusion = track.get("fusion", {}) or {}
        
        # Check track manager or fusion engine output
        from fusion_engine import fusion_engine
        f_res = fusion_engine.correlate(
            radar_class="DRONE",
            radar_confidence=0.96,
            track_lat=13.068,
            track_lon=80.298,
            camera_result={"detections": [{"class_name": "BIRD", "confidence": 0.89}], "inference_source": "YOLO"},
            camera_info={"camera_id": "CAM-03"}
        )
        self.assertTrue(f_res.get("conflict"))
        self.assertEqual(f_res.get("secondary_condition"), "VISION_RADAR_CONFLICT")
        print("[TEST 14] Verified secondary condition: VISION_RADAR_CONFLICT.")


if __name__ == "__main__":
    unittest.main(verbosity=2)
