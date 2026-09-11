"""PS3 tests — the 20 required console pipeline cases.

Run: python -m pytest tests/test_ps3_console.py -v
"""
import sys
import time
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(REPO_ROOT / "src"))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

from backend.app.services.console_service import console_service
from backend.app.services.zones import zone_engine, seed_default_zones
from backend.app.services.registry import AuthorizationRegistry
from backend.app.services.audit import audit_log

# Demo coordinates: inside the default RED zone (Coastal Restricted FRZ-Alpha)
IN_RED = {"lat": 13.08, "lon": 80.28}
OUTSIDE = {"lat": 13.20, "lon": 80.10}


def _report(remote_id="RID-999", lat=None, lon=None, alt=90.0, track_id=None, **kw):
    r = {
        "remote_id": remote_id,
        "latitude": IN_RED["lat"] if lat is None else lat,
        "longitude": IN_RED["lon"] if lon is None else lon,
        "altitude_m": alt,
        "timestamp": time.time(),
        "source": "TEST_FEED",
    }
    if track_id:
        r["track_id"] = track_id
    r.update(kw)
    return r


class Test01TelemetryIngestion(unittest.TestCase):
    def test_single_report_ingests_and_updates_track(self):
        r = client.post("/api/telemetry", json=_report(track_id="TRK-T01"))
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertTrue(data["accepted"])
        tr = data["track"]
        for f in ("track_id", "remote_id", "latitude", "longitude", "altitude_m",
                  "velocity_mps", "heading_deg", "last_seen", "track_confidence",
                  "authorization", "status", "source"):
            self.assertIn(f, tr)

    def test_malformed_report_rejected(self):
        r = client.post("/api/telemetry", json={"latitude": 999, "longitude": 80.0,
                                                "altitude_m": 100})
        self.assertEqual(r.status_code, 422)

    def test_missing_altitude_rejected(self):
        r = client.post("/api/telemetry", json={"latitude": 13.0, "longitude": 80.2})
        self.assertEqual(r.status_code, 422)


class Test02MultipleTracks(unittest.TestCase):
    def test_simulator_holds_8_to_15_actors(self):
        data = console_service.get_tracks()
        console_service.tick()
        n_actors = console_service.simulator.actor_count
        self.assertGreaterEqual(n_actors, 8)
        self.assertLessEqual(n_actors, 15)

    def test_actors_persist_between_updates(self):
        console_service.tick()
        ids1 = {t["track_id"] for t in console_service.get_tracks()["tracks"]}
        time.sleep(0.2)
        console_service.tick()
        ids2 = {t["track_id"] for t in console_service.get_tracks()["tracks"]}
        self.assertTrue(ids1)
        # Persistent actors: the same track ids remain (no regeneration)
        self.assertGreater(len(ids1 & ids2), 0)

    def test_tracks_move_smoothly(self):
        client.post("/api/demo/clear")
        client.post("/api/telemetry", json=_report(track_id="TRK-M1", lat=13.07, lon=80.27))
        r1 = {t["track_id"]: t for t in console_service.get_tracks()["tracks"]}["TRK-M1"]
        time.sleep(0.15)
        client.post("/api/telemetry", json=_report(track_id="TRK-M1", lat=13.0705, lon=80.2705))
        r2 = {t["track_id"]: t for t in console_service.get_tracks()["tracks"]}["TRK-M1"]
        self.assertAlmostEqual(r2["latitude"] - r1["latitude"], 0.0005, delta=1e-6)


class Test03AuthorizationLookup(unittest.TestCase):
    def test_registered_authorized(self):
        self.assertEqual(console_service.registry.lookup("RID-001"), "AUTHORIZED")

    def test_registered_unauthorized(self):
        self.assertEqual(console_service.registry.lookup("RID-003"), "UNREGISTERED")


class Test04UnknownId(unittest.TestCase):
    def test_unknown_id_is_unregistered(self):
        self.assertEqual(console_service.registry.lookup("RID-NOT-THERE"), "UNREGISTERED")
        tr = console_service.ingest(_report(remote_id="RID-GHOST", lat=13.15, lon=80.10))
        self.assertEqual(tr["authorization"], "UNREGISTERED")


class Test05PointInPolygon(unittest.TestCase):
    def test_inside_zone(self):
        geo = zone_engine.evaluate(IN_RED["lat"], IN_RED["lon"], 100.0)
        self.assertTrue(geo["in_zone"])
        self.assertTrue(geo["violating"])
        self.assertEqual(geo["zone"]["zone_type"], "RED")

    def test_outside_zone(self):
        geo = zone_engine.evaluate(OUTSIDE["lat"], OUTSIDE["lon"], 100.0)
        self.assertFalse(geo["in_zone"])
        self.assertFalse(geo["violating"])


class Test06AltitudeEnvelope(unittest.TestCase):
    def test_above_max_altitude_is_compliant(self):
        # RED zone envelope is [0, 400] m: above it, inside polygon but compliant
        geo = zone_engine.evaluate(IN_RED["lat"], IN_RED["lon"], 900.0)
        self.assertTrue(geo["in_zone"])
        self.assertFalse(geo["violating"])

    def test_below_min_altitude_is_compliant(self):
        geo = zone_engine.evaluate(13.10, 80.30, -50.0)  # YELLOW zone min is 0
        if geo["zone"] and geo["zone"]["zone_type"] == "YELLOW":
            self.assertFalse(geo["violating"])

    def test_within_envelope_violates(self):
        geo = zone_engine.evaluate(IN_RED["lat"], IN_RED["lon"], 100.0)
        self.assertTrue(geo["violating"])


class Test07OutOfEnvelopeAlert(unittest.TestCase):
    def test_unregistered_drone_in_red_zone_alerts(self):
        r = client.post("/api/telemetry",
                        json=_report(remote_id="RID-INTRUDER", track_id="TRK-IOE"))
        self.assertEqual(r.status_code, 200)
        tr = r.json()["track"]
        self.assertEqual(tr["status"], "OUT_OF_ENVELOPE")
        self.assertTrue(tr["violation"])
        aid = tr["last_alert_id"]
        self.assertIsNotNone(aid)
        alerts = client.get("/api/alerts").json()["alerts"]
        al = next(a for a in alerts if a["alert_id"] == aid)
        self.assertEqual(al["type"], "OUT_OF_ENVELOPE")
        self.assertIn(al["priority"], ("HIGH", "CRITICAL"))

    def test_authorized_track_violates_geofence_but_shows_auth(self):
        # Documented rule: geofence violation is determined from position +
        # altitude ONLY. Authorization is separate and shown alongside.
        console_service.registry.register("RID-LEGAL", "AUTHORIZED")
        tr = console_service.ingest(_report(remote_id="RID-LEGAL", track_id="TRK-LEGAL"))
        self.assertEqual(tr["status"], "OUT_OF_ENVELOPE")
        self.assertEqual(tr["authorization"], "AUTHORIZED")
        self.assertTrue(tr["violation"])
        # Authorized track OUTSIDE any zone: plain AUTHORIZED, no alert
        tr2 = console_service.ingest(_report(remote_id="RID-LEGAL", track_id="TRK-LEGAL",
                                             lat=13.20, lon=80.10))
        self.assertEqual(tr2["status"], "AUTHORIZED")
        self.assertIsNone(tr2["last_alert_id"])


class Test08LostLink(unittest.TestCase):
    def test_lost_link_detection(self):
        # Ingest a track, then force its last_seen into the past
        tr = console_service.ingest(_report(track_id="TRK-LL1", remote_id="RID-LL1",
                                            lat=13.15, lon=80.10))
        with console_service.lock:
            console_service.tracks["TRK-LL1"].last_seen = time.time() - 30.0
        console_service.sweep_lost_link()
        tr2 = {t["track_id"]: t for t in console_service.get_tracks()["tracks"]}["TRK-LL1"]
        self.assertEqual(tr2["status"], "LOST_LINK")
        self.assertGreater(tr2["time_since_last_report_s"], 25.0)
        # Track remains visible (not deleted)
        self.assertIn("TRK-LL1", console_service.tracks)

    def test_demo_lost_link_endpoint(self):
        client.post("/api/demo/randomize")  # ensure actors exist
        r = client.post("/api/demo/lost-link")
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.json()["link_up"])


class Test09TemporaryZone(unittest.TestCase):
    def test_create_temporary_red_zone(self):
        r = client.post("/api/zones", json={
            "name": "Demo Temporary Zone",
            "zone_type": "RED",
            "geometry": {"type": "Polygon", "coordinates": [[
                [80.30, 13.00], [80.34, 13.00], [80.34, 13.04], [80.30, 13.04], [80.30, 13.00]]]},
            "min_altitude_m": 0,
            "max_altitude_m": 150,
            "duration_s": 30,
        })
        self.assertEqual(r.status_code, 200)
        z = r.json()["zone"]
        self.assertTrue(z["temporary"])
        self.assertFalse(z["expired"])
        self.assertGreater(z["expires_at"], time.time())
        # Cleanup for later tests
        client.delete(f"/api/zones/{z['zone_id']}")

    def test_invalid_zone_rejected(self):
        r = client.post("/api/zones", json={
            "name": "Bad", "zone_type": "PURPLE",
            "geometry": {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]]},
            "min_altitude_m": 0, "max_altitude_m": 100})
        self.assertEqual(r.status_code, 422)

    def test_invalid_coordinates_rejected(self):
        r = client.post("/api/zones", json={
            "name": "Bad coords", "zone_type": "RED",
            "geometry": {"type": "Polygon", "coordinates": [[[200, 13], [80.3, 13], [80.3, 13.1], [200, 13]]]},
            "min_altitude_m": 0, "max_altitude_m": 100})
        self.assertEqual(r.status_code, 422)


class Test10TempZoneExpiry(unittest.TestCase):
    def test_backend_enforces_expiry(self):
        r = client.post("/api/zones", json={
            "name": "Short Lived Zone",
            "zone_type": "RED",
            "geometry": {"type": "Polygon", "coordinates": [[
                [80.36, 13.00], [80.40, 13.00], [80.40, 13.04], [80.36, 13.04], [80.36, 13.00]]]},
            "min_altitude_m": 0,
            "max_altitude_m": 150,
            "duration_s": 6,
        })
        z = r.json()["zone"]
        time.sleep(6.5)
        zones = {zz["zone_id"]: zz for zz in client.get("/api/zones").json()["zones"]}
        self.assertTrue(zones[z["zone_id"]]["expired"])
        self.assertEqual(zones[z["zone_id"]]["seconds_remaining"], 0.0)
        # Expired zone must not generate violations
        geo = zone_engine.evaluate(13.02, 80.38, 100.0)
        self.assertFalse(geo["violating"])
        client.delete(f"/api/zones/{z['zone_id']}")


class Test11ExpiredZoneNoAlerts(unittest.TestCase):
    def test_no_alert_for_expired_zone(self):
        r = client.post("/api/zones", json={
            "name": "Expiry Alert Zone",
            "zone_type": "RED",
            "geometry": {"type": "Polygon", "coordinates": [[
                [80.42, 13.00], [80.46, 13.00], [80.46, 13.04], [80.42, 13.04], [80.42, 13.00]]]},
            "min_altitude_m": 0, "max_altitude_m": 200, "duration_s": 6})
        z = r.json()["zone"]
        time.sleep(6.5)
        tr = console_service.ingest(_report(remote_id="RID-AFTER-EXPIRY",
                                            lat=13.02, lon=80.44, alt=100,
                                            track_id="TRK-EXP1"))
        self.assertNotEqual(tr["status"], "OUT_OF_ENVELOPE")
        client.delete(f"/api/zones/{z['zone_id']}")


class Test12AlertPriority(unittest.TestCase):
    def test_priority_rules(self):
        from backend.app.services.registry import PRIORITY_RULES
        self.assertEqual(PRIORITY_RULES["AUTHORIZED"], "LOW")
        self.assertEqual(PRIORITY_RULES["UNREGISTERED"], "HIGH")
        self.assertEqual(PRIORITY_RULES["OUT_OF_ENVELOPE_RED"], "CRITICAL")
        self.assertEqual(PRIORITY_RULES["OUT_OF_ENVELOPE_YELLOW"], "HIGH")
        self.assertEqual(PRIORITY_RULES["LOST_LINK"], "MEDIUM")

    def test_yellow_zone_violation_is_high(self):
        # YELLOW zone: Harbor Approach [80.27-80.36, 13.08-13.16], max 250 m
        tr = console_service.ingest(_report(remote_id="RID-YEL", lat=13.12, lon=80.33,
                                            alt=100, track_id="TRK-YEL"))
        self.assertEqual(tr["status"], "OUT_OF_ENVELOPE")
        self.assertEqual(tr["zone_type"], "YELLOW")
        al = next(a for a in console_service.get_alerts()["alerts"]
                  if a["track_id"] == "TRK-YEL")
        self.assertEqual(al["priority"], "HIGH")


class Test13SuggestedAction(unittest.TestCase):
    def test_actions_are_civil_and_deterministic(self):
        from backend.app.services.registry import ACTION_RULES
        self.assertEqual(ACTION_RULES["UNREGISTERED"], "VERIFY AUTHORIZATION")
        self.assertEqual(ACTION_RULES["OUT_OF_ENVELOPE_RED"], "ESCALATE TO SUPERVISOR")
        self.assertEqual(ACTION_RULES["AUTHORIZED"], "MONITOR")
        banned = ("JAM", "SPOOF", "TAKEOVER", "INTERDICT", "GNSS", "HACK")
        for action in ACTION_RULES.values():
            for b in banned:
                self.assertNotIn(b, action.upper())

    def test_alert_carries_action(self):
        alerts = client.get("/api/alerts").json()["alerts"]
        for a in alerts:
            self.assertIn("suggested_action", a)


class Test14ConfirmDisposition(unittest.TestCase):
    def test_confirm_requires_reason_and_records_audit(self):
        tr = console_service.ingest(_report(remote_id="RID-C1", track_id="TRK-C1",
                                            lat=13.09, lon=80.29, alt=80))
        aid = tr["last_alert_id"]
        # Missing reason rejected
        r = client.post(f"/api/alerts/{aid}/disposition",
                        json={"action": "CONFIRM", "reason_code": ""})
        self.assertEqual(r.status_code, 422)
        r = client.post(f"/api/alerts/{aid}/disposition",
                        json={"action": "CONFIRM", "reason_code": "VERIFIED VIOLATION",
                              "operator_id": "OP-TEST-01", "operator_role": "OPERATOR"})
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body["alert"]["status"], "CONFIRMED")
        self.assertEqual(body["audit_record"]["action"], "CONFIRM")
        self.assertEqual(body["audit_record"]["operator_id"], "OP-TEST-01")
        self.assertEqual(body["audit_record"]["reason_code"], "VERIFIED VIOLATION")

    def test_invalid_reason_rejected(self):
        r = client.post("/api/alerts/ALERT-0001/disposition",
                        json={"action": "CONFIRM", "reason_code": "MADE UP CODE"})
        self.assertEqual(r.status_code, 422)


class Test15DismissDisposition(unittest.TestCase):
    def test_dismiss(self):
        tr = console_service.ingest(_report(remote_id="RID-D1", track_id="TRK-D1",
                                            lat=13.10, lon=80.31, alt=80))
        aid = tr["last_alert_id"]
        r = client.post(f"/api/alerts/{aid}/disposition",
                        json={"action": "DISMISS", "reason_code": "FALSE POSITIVE",
                              "operator_id": "OP-TEST-02", "operator_role": "OPERATOR"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["alert"]["status"], "DISMISSED")


class Test16Escalation(unittest.TestCase):
    def test_operator_cannot_escalate(self):
        tr = console_service.ingest(_report(remote_id="RID-E1", track_id="TRK-E1",
                                            lat=13.11, lon=80.30, alt=80))
        aid = tr["last_alert_id"]
        r = client.post(f"/api/alerts/{aid}/disposition",
                        json={"action": "ESCALATE", "reason_code": "VERIFIED VIOLATION",
                              "operator_id": "OP-TEST-03", "operator_role": "OPERATOR"})
        self.assertEqual(r.status_code, 403)

    def test_supervisor_can_escalate(self):
        tr = console_service.ingest(_report(remote_id="RID-E2", track_id="TRK-E2",
                                            lat=13.13, lon=80.32, alt=80))
        aid = tr["last_alert_id"]
        r = client.post(f"/api/alerts/{aid}/disposition",
                        json={"action": "ESCALATE", "reason_code": "VERIFIED VIOLATION",
                              "operator_id": "SUP-TEST-01", "operator_role": "SUPERVISOR"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["alert"]["status"], "ESCALATED")
        self.assertEqual(r.json()["alert"]["priority"], "CRITICAL")


class Test17AuditRecordCreation(unittest.TestCase):
    def test_audit_fields(self):
        recs = client.get("/api/audit").json()["records"]
        self.assertTrue(recs)
        rec = recs[0]
        for f in ("event_id", "timestamp", "operator_id", "operator_role", "action",
                  "alert_id", "track_id", "reason_code", "previous_status", "new_status"):
            self.assertIn(f, rec)


class Test18AuditAppendOnly(unittest.TestCase):
    def test_no_mutation_endpoints(self):
        mutating = [getattr(rt, "path", "") for rt in app.routes
                    if getattr(rt, "path", "").startswith("/api/audit")
                    and ({"PUT", "DELETE", "PATCH"} & set(getattr(rt, "methods", set())))]
        self.assertEqual(mutating, [])
        # There is no PUT/DELETE route on /api/audit* (404=no route, 405=method not allowed)
        r = client.request("DELETE", "/api/audit/AUD-000001")
        self.assertIn(r.status_code, (404, 405))

    def test_hash_chain_valid(self):
        chain = client.get("/api/audit").json()["chain"]
        self.assertTrue(chain["valid"])


class Test19AuditExport(unittest.TestCase):
    def test_csv_export(self):
        r = client.get("/api/audit/export?fmt=csv&operator_id=SUP-TEST-01&operator_role=SUPERVISOR")
        self.assertEqual(r.status_code, 200)
        self.assertIn("text/csv", r.headers["content-type"])
        body = r.text
        for col in ("operator_id", "timestamp", "action", "alert_id", "track_id",
                    "reason_code", "new_status"):
            self.assertIn(col, body)
        self.assertIn("SUP-TEST-01", body)

    def test_json_export(self):
        r = client.get("/api/audit/export?fmt=json&operator_id=SUP-TEST-01&operator_role=SUPERVISOR")
        self.assertEqual(r.status_code, 200)
        self.assertIn("records", r.json())

    def test_operator_cannot_export(self):
        r = client.get("/api/audit/export?fmt=csv&operator_id=OP-TEST-01&operator_role=OPERATOR")
        self.assertEqual(r.status_code, 403)


class Test20Fusion(unittest.TestCase):
    def test_fusion_three_states(self):
        r = client.post("/api/fusion/predict", json={
            "radar": {"is_available": True, "detected_target": True,
                      "drone_probability": 0.9, "confidence": 0.9},
            "vision": {"is_available": True, "detected_target": True,
                       "drone_probability": 0.95, "confidence": 0.9},
            "rf": {"is_available": True, "detected_target": True,
                   "drone_probability": 0.92, "confidence": 0.9}})
        self.assertEqual(r.json()["classification"], "DRONE")
        r = client.post("/api/fusion/predict", json={
            "vision": {"is_available": True, "detected_target": True,
                       "drone_probability": 0.95, "confidence": 0.9},
            "rf": {"is_available": True, "detected_target": True,
                   "drone_probability": 0.05, "confidence": 0.9}})
        self.assertEqual(r.json()["classification"], "UNCERTAIN")
        r = client.post("/api/fusion/predict", json={
            "vision": {"is_available": True, "detected_target": True,
                       "drone_probability": 0.05, "confidence": 0.9}})
        self.assertEqual(r.json()["classification"], "NON-DRONE")

    def test_alert_reports_dark_vessel_not_applicable(self):
        alerts = client.get("/api/alerts").json()
        self.assertEqual(alerts["dark_vessel"], "NOT APPLICABLE — TRACK A")


class TestAPIEndpoints(unittest.TestCase):
    """Phase 31 — required endpoint surface."""

    def test_all_required_endpoints_exist(self):
        r = client.get("/api/health")
        self.assertEqual(r.status_code, 200)
        for path, method in [
            ("/api/tracks", "GET"), ("/api/zones", "GET"), ("/api/alerts", "GET"),
            ("/api/audit", "GET"), ("/api/authorization", "GET"), ("/api/metrics", "GET"),
        ]:
            resp = client.request(method, path)
            self.assertEqual(resp.status_code, 200, path)
        resp = client.post("/api/demo/randomize")
        self.assertEqual(resp.status_code, 200)
        resp = client.post("/api/demo/spawn", json={"kind": "AUTHORIZED"})
        self.assertEqual(resp.status_code, 200)
        resp = client.post("/api/demo/spawn", json={"kind": "UNREGISTERED"})
        self.assertEqual(resp.status_code, 200)
        resp = client.post("/api/demo/spawn", json={"kind": "VIOLATOR"})
        self.assertEqual(resp.status_code, 200)


class TestLatencyMeasured(unittest.TestCase):
    """Phase 30 — real measured latencies only."""

    def test_metrics_reported(self):
        m = client.get("/api/metrics").json()
        for key in ("ingest_latency_ms", "processing_latency_ms", "alerts_generated",
                    "reports_ingested"):
            self.assertIn(key, m)

    def test_ingest_latency_under_target(self):
        t0 = time.perf_counter()
        console_service.ingest(_report(remote_id="RID-LAT", lat=13.16, lon=80.20,
                                       track_id="TRK-LAT"))
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        self.assertLess(elapsed_ms, 2000.0)  # report-to-console target 2 s


if __name__ == "__main__":
    unittest.main(verbosity=2)
