import time
import math
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List

from astra_engine import astra_engine
from yolo_engine import yolo_engine
from fusion_engine import fusion_engine
from rules_engine import rules_engine
from track_manager import track_manager
from ingestion_service import ingestion_service
from audit_service import audit_service
from db import get_db

SCENARIOS = {
    "AUTHORIZED_DRONE": {
        "id": "AUTHORIZED_DRONE",
        "name": "1. Authorized Drone (Compliant)",
        "track_id": "DRN-001",
        "uas_id": "UIN-2026-IND-0101",
        "object_type": "DRONE",
        "start_lat": 13.095,
        "start_lon": 80.305,
        "target_lat": 13.105,
        "target_lon": 80.315,
        "altitude_m": 65.0,
        "speed_mps": 12.0,
        "heading_deg": 35.0,
        "description": "Tamil Nadu Port Authority inspection flight operating under approved permit PERM-2026-081 in ZONE-PORT-02."
    },
    "UNREGISTERED_DRONE": {
        "id": "UNREGISTERED_DRONE",
        "name": "2. Unregistered Drone (Non-Compliant)",
        "track_id": "UNKNOWN-UAS-999",
        "uas_id": "UNKNOWN-UAS-999",
        "object_type": "DRONE",
        "start_lat": 13.040,
        "start_lon": 80.285,
        "target_lat": 13.055,
        "target_lon": 80.290,
        "altitude_m": 75.0,
        "speed_mps": 15.0,
        "heading_deg": 15.0,
        "description": "Unregistered quadcopter flying over civilian sector without DGCA civil registry match."
    },
    "ALTITUDE_VIOLATION": {
        "id": "ALTITUDE_VIOLATION",
        "name": "3. Altitude Violation (Out of Envelope)",
        "track_id": "DRN-001",
        "uas_id": "UIN-2026-IND-0101",
        "object_type": "DRONE",
        "start_lat": 13.095,
        "start_lon": 80.305,
        "target_lat": 13.105,
        "target_lon": 80.315,
        "altitude_m": 250.0,  # Breaches 80m approved ceiling
        "speed_mps": 14.0,
        "heading_deg": 25.0,
        "description": "Registered drone exceeding maximum permitted altitude ceiling (250m vs 80m approved ceiling)."
    },
    "TEMP_RED_ZONE_VIOLATION": {
        "id": "TEMP_RED_ZONE_VIOLATION",
        "name": "4. Temporary Red-Zone Violation",
        "track_id": "TRACK-INTRUDER-01",
        "uas_id": "UIN-2026-IND-0101",
        "object_type": "DRONE",
        "start_lat": 13.068,
        "start_lon": 80.298,
        "target_lat": 13.078,
        "target_lon": 80.305,
        "altitude_m": 65.0,
        "speed_mps": 10.0,
        "heading_deg": 10.0,
        "description": "Target penetrating newly active tactical law enforcement temporary red zone."
    },
    "LOST_LINK": {
        "id": "LOST_LINK",
        "name": "5. Lost Link Telemetry Test",
        "track_id": "RID-004",
        "uas_id": "UIN-2026-IND-0101",
        "object_type": "DRONE",
        "start_lat": 13.068,
        "start_lon": 80.298,
        "target_lat": 13.072,
        "target_lon": 80.300,
        "altitude_m": 70.0,
        "speed_mps": 10.0,
        "heading_deg": 40.0,
        "max_reports": 4,
        "description": "Transmits 4 reports then cuts signal to trigger LOST_LINK, followed by automated telemetry restoration."
    },
    "SENSOR_CONFLICT": {
        "id": "SENSOR_CONFLICT",
        "name": "6. Classification Conflict (Radar vs Camera)",
        "track_id": "TRACK-CONFLICT-01",
        "uas_id": "UIN-2026-IND-0101",
        "object_type": "DRONE",
        "vision_class": "BIRD",
        "start_lat": 13.068,
        "start_lon": 80.298,
        "target_lat": 13.074,
        "target_lon": 80.302,
        "altitude_m": 45.0,
        "speed_mps": 9.0,
        "heading_deg": 45.0,
        "description": "Micro-Doppler classifies target as DRONE, but Optical Camera classifies as BIRD. Flags VISION_RADAR_CONFLICT."
    },
    "MULTI_OBJECT": {
        "id": "MULTI_OBJECT",
        "name": "7. Multiple Objects in Airspace",
        "track_id": "DRN-001",
        "uas_id": "UIN-2026-IND-0101",
        "object_type": "DRONE",
        "start_lat": 13.095,
        "start_lon": 80.305,
        "target_lat": 13.110,
        "target_lon": 80.320,
        "altitude_m": 65.0,
        "speed_mps": 12.0,
        "heading_deg": 45.0,
        "description": "Simultaneous multi-target tracking: Authorized commercial UAV, unregistered drone, and out-of-envelope drone."
    }
}

SCENARIOS["TEMP_RED_VIOLATION"] = SCENARIOS["TEMP_RED_ZONE_VIOLATION"]
SCENARIOS["CLASSIFICATION_CONFLICT"] = SCENARIOS["SENSOR_CONFLICT"]

SCENARIO_ROTATION_ORDER = [
    "AUTHORIZED_DRONE",
    "UNREGISTERED_DRONE",
    "ALTITUDE_VIOLATION",
    "TEMP_RED_ZONE_VIOLATION",
    "LOST_LINK",
    "SENSOR_CONFLICT",
    "MULTI_OBJECT"
]


class SimulationEngine:
    def __init__(self):
        self.state = "STOPPED"
        self.speed = 1.0
        self.active_scenario_key = "AUTHORIZED_DRONE"
        self.step_index = 0
        self.reports_sent_for_scenario = 0
        self.auto_cycle = False
        self.cycle_interval_steps = 25
        self.scenario_cycle = SCENARIO_ROTATION_ORDER

        self.current_lat = 13.095
        self.current_lon = 80.305
        self.current_alt = 65.0
        self.current_speed = 12.0
        self.current_heading = 35.0
        self.live_events = []
        self.lost_link_resumed = False
        self.lost_link_silence_count = 0
        self.multi_tracks_state = {}

    def reset_simulation(self, keep_running=False):
        self.state = "RUNNING" if keep_running else "STOPPED"
        self.step_index = 0
        self.reports_sent_for_scenario = 0
        self.lost_link_resumed = False
        self.lost_link_silence_count = 0

        track_manager.clear_demo_tracks()

        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
                DELETE FROM restricted_zones
                WHERE zone_id LIKE 'ZONE-TEMP-DEMO%'
            """)
            cursor.execute("""
                UPDATE restricted_zones
                SET active = 0
                WHERE zone_id LIKE 'ZONE-TEMP%' OR zone_id LIKE 'TEMP-RED%'
            """)
            cursor.execute("""
                UPDATE alerts
                SET status = 'RESOLVED', disposition = 'DISMISSED', disposition_reason = 'RESET'
                WHERE status = 'ACTIVE'
            """)
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[Sim Reset DB Error] {e}")

        try:
            audit_service.log_event(
                operator_id="SIMULATOR",
                operator_role="SYSTEM",
                action="SCENARIO_RESET",
                resource_type="SIMULATION",
                resource_id=self.active_scenario_key,
                result="RESET",
                reason_code="BASELINE_RESTORED",
                details="Simulation reset to clean baseline. Demo tracks and temporary zones cleared."
            )
        except Exception:
            pass

        self.live_events = [
            {
                "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S"),
                "type": "SIMULATION_RESET",
                "message": "Simulator reset to clean baseline. Ready for scenario execution."
            }
        ]

    def _ensure_temp_red_zone(self):
        try:
            conn = get_db()
            cursor = conn.cursor()
            zone_id = "ZONE-TEMP-DEMO"
            exp_time = datetime.now(timezone.utc) + timedelta(seconds=60)
            expires_at = exp_time.strftime("%Y-%m-%d %H:%M:%S")
            poly = [
                [13.060, 80.290],
                [13.076, 80.290],
                [13.076, 80.306],
                [13.060, 80.306]
            ]
            cursor.execute("""
                INSERT OR REPLACE INTO restricted_zones 
                (zone_id, name, zone_type, min_altitude_m, max_altitude_m, polygon_coords, severity, description, expires_at, created_by, active, reason)
                VALUES (?, 'Tactical Bomb Squad Perimeter (Demo)', 'TEMPORARY_RED', 0.0, 400.0, ?, 'CRITICAL',
                        'Law enforcement temporary exclusion zone', ?, 'SYSTEM_DEMO', 1, 'VIP Tactical Cordon')
            """, (zone_id, json.dumps(poly), expires_at))
            conn.commit()
            conn.close()

            audit_service.log_event(
                operator_id="SIMULATOR",
                operator_role="SYSTEM",
                action="TEMP_ZONE_CREATED",
                resource_type="GEOFENCE",
                resource_id=zone_id,
                result="ACTIVE",
                reason_code="TACTICAL_AIRSPACE_RESTRICTION",
                details="Temporary red zone ZONE-TEMP-DEMO activated (60s duration)."
            )
        except Exception as e:
            print(f"[Temp Red Zone Setup Error] {e}")

    def _init_multi_object_state(self):
        self.multi_tracks_state = {
            "DRN-001": {
                "track_id": "DRN-001",
                "uas_id": "UIN-2026-IND-0101",
                "lat": 13.095, "lon": 80.305, "alt": 65.0,
                "speed": 12.0, "heading": 45.0, "object_type": "DRONE"
            },
            "UNKNOWN-UAS-003": {
                "track_id": "UNKNOWN-UAS-003",
                "uas_id": "UNKNOWN-GHOST-33",
                "lat": 13.045, "lon": 80.280, "alt": 50.0,
                "speed": 14.0, "heading": 90.0, "object_type": "DRONE"
            },
            "DRN-002": {
                "track_id": "DRN-002",
                "uas_id": "UIN-2026-IND-0102",
                "lat": 13.070, "lon": 80.290, "alt": 220.0,
                "speed": 18.0, "heading": 180.0, "object_type": "DRONE"
            }
        }

    def start(self, scenario_key=None, speed=1.0):
        if scenario_key:
            alias_map = {
                "TEMP_RED_VIOLATION": "TEMP_RED_ZONE_VIOLATION",
                "CLASSIFICATION_CONFLICT": "SENSOR_CONFLICT"
            }
            scenario_key = alias_map.get(scenario_key, scenario_key)
            if scenario_key in SCENARIOS:
                self.active_scenario_key = scenario_key

        self.speed = float(speed)
        self.state = "RUNNING"
        self.step_index = 0
        self.reports_sent_for_scenario = 0
        self.lost_link_resumed = False
        self.lost_link_silence_count = 0

        track_manager.clear_demo_tracks()

        if self.active_scenario_key == "TEMP_RED_ZONE_VIOLATION":
            self._ensure_temp_red_zone()
            scenario = SCENARIOS[self.active_scenario_key]
            self.current_lat = scenario["start_lat"]
            self.current_lon = scenario["start_lon"]
            self.current_alt = scenario["altitude_m"]
            self.current_speed = scenario["speed_mps"]
            self.current_heading = scenario["heading_deg"]
        elif self.active_scenario_key == "MULTI_OBJECT":
            self._init_multi_object_state()
        else:
            scenario = SCENARIOS.get(self.active_scenario_key, SCENARIOS["AUTHORIZED_DRONE"])
            self.current_lat = scenario["start_lat"]
            self.current_lon = scenario["start_lon"]
            self.current_alt = scenario["altitude_m"]
            self.current_speed = scenario["speed_mps"]
            self.current_heading = scenario["heading_deg"]

        try:
            audit_service.log_event(
                operator_id="CONSOLE_OPERATOR",
                operator_role="OFFICER",
                action="SCENARIO_STARTED",
                resource_type="SIMULATION",
                resource_id=self.active_scenario_key,
                result="SUCCESS",
                reason_code="DEMO_EXECUTION",
                details=f"Scenario '{self.active_scenario_key}' launched at speed {self.speed}x."
            )
        except Exception:
            pass

        self.add_event("SIMULATION_STARTED", f"Running Track-A scenario: {SCENARIOS.get(self.active_scenario_key, {}).get('name', self.active_scenario_key)}")
        self._send_telemetry_report()
        return self.get_scenario_state()

    def pause(self):
        self.state = "PAUSED"
        self.add_event("SIMULATION_PAUSED", "Simulation execution paused by operator. Tracks frozen.")
        try:
            audit_service.log_event(
                operator_id="CONSOLE_OPERATOR",
                operator_role="OFFICER",
                action="SCENARIO_PAUSED",
                resource_type="SIMULATION",
                resource_id=self.active_scenario_key,
                result="PAUSED",
                reason_code="OPERATOR_PAUSE",
                details=f"Scenario '{self.active_scenario_key}' paused."
            )
        except Exception:
            pass

    def resume(self):
        self.state = "RUNNING"
        self.add_event("SIMULATION_RESUMED", "Simulation execution resumed.")
        try:
            audit_service.log_event(
                operator_id="CONSOLE_OPERATOR",
                operator_role="OFFICER",
                action="SCENARIO_RESUMED",
                resource_type="SIMULATION",
                resource_id=self.active_scenario_key,
                result="RESUMED",
                reason_code="OPERATOR_RESUME",
                details=f"Scenario '{self.active_scenario_key}' resumed."
            )
        except Exception:
            pass

    def stop(self):
        self.state = "STOPPED"
        self.add_event("SIMULATION_STOPPED", "Simulation execution halted. Telemetry transmission stopped.")
        try:
            audit_service.log_event(
                operator_id="CONSOLE_OPERATOR",
                operator_role="OFFICER",
                action="SCENARIO_STOPPED",
                resource_type="SIMULATION",
                resource_id=self.active_scenario_key,
                result="STOPPED",
                reason_code="OPERATOR_STOP",
                details=f"Scenario '{self.active_scenario_key}' stopped."
            )
        except Exception:
            pass

    def set_speed(self, speed):
        self.speed = float(speed)

    def toggle_auto_cycle(self, enabled=None):
        if enabled is not None:
            self.auto_cycle = bool(enabled)
        else:
            self.auto_cycle = not self.auto_cycle
        return self.auto_cycle

    def add_event(self, event_type: str, message: str):
        evt = {
            "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S"),
            "type": event_type,
            "message": message
        }
        self.live_events.insert(0, evt)
        if len(self.live_events) > 50:
            self.live_events.pop()

    def resume_lost_link_telemetry(self):
        self.lost_link_resumed = True
        self.add_event("LOST_LINK_RECOVERY", "Telemetry link resumed by operator. Target transmitting live again.")
        self._send_telemetry_report()

    def update_step(self, dt=0.8):
        track_manager.check_heartbeats()

        if self.state != "RUNNING":
            return self.get_snapshot()

        scenario = SCENARIOS.get(self.active_scenario_key, SCENARIOS["AUTHORIZED_DRONE"])

        if self.auto_cycle and self.step_index >= self.cycle_interval_steps:
            try:
                cur_idx = self.scenario_cycle.index(self.active_scenario_key)
                next_key = self.scenario_cycle[(cur_idx + 1) % len(self.scenario_cycle)]
            except ValueError:
                next_key = self.scenario_cycle[0]
            self.start(next_key, self.speed)
            return self.get_snapshot()

        effective_dt = dt * self.speed
        self.step_index += 1

        if self.active_scenario_key == "LOST_LINK" and not self.lost_link_resumed:
            max_r = scenario.get("max_reports", 4)
            if self.reports_sent_for_scenario >= max_r:
                self.lost_link_silence_count += 1
                self.add_event("LOST_LINK_SILENCE", f"Telemetry silence ({self.lost_link_silence_count * 0.8:.1f}s). Watchdog evaluating timeout...")
                if self.lost_link_silence_count >= 8:
                    self.resume_lost_link_telemetry()
                return self.get_snapshot()

        if self.active_scenario_key == "MULTI_OBJECT":
            for tid, obj in self.multi_tracks_state.items():
                h_rad = math.radians(obj["heading"])
                dist = obj["speed"] * effective_dt
                m_lat = 111000.0
                m_lon = 111000.0 * math.cos(math.radians(obj["lat"]))
                obj["lat"] += (dist * math.cos(h_rad) / m_lat)
                obj["lon"] += (dist * math.sin(h_rad) / m_lon)
                report = {
                    "source": "SIMULATOR",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "track_id": obj["track_id"],
                    "uas_id": obj["uas_id"],
                    "object_type": obj["object_type"],
                    "latitude": round(obj["lat"], 6),
                    "longitude": round(obj["lon"], 6),
                    "altitude_m": round(obj["alt"], 1),
                    "speed_mps": round(obj["speed"], 1),
                    "heading_deg": round(obj["heading"], 1),
                    "scenario": "MULTI_OBJECT"
                }
                ingestion_service.validate_and_ingest(report)
            return self.get_snapshot()

        heading_rad = math.radians(self.current_heading)
        dist_m = self.current_speed * effective_dt
        meters_per_deg_lat = 111000.0
        meters_per_deg_lon = 111000.0 * math.cos(math.radians(self.current_lat))

        self.current_lat += (dist_m * math.cos(heading_rad) / meters_per_deg_lat)
        self.current_lon += (dist_m * math.sin(heading_rad) / meters_per_deg_lon)

        alt_variation = math.sin(self.step_index * 0.2) * 1.5
        self.current_alt = max(10.0, scenario["altitude_m"] + alt_variation)

        self._send_telemetry_report()
        return self.get_snapshot()

    def _send_telemetry_report(self):
        scenario = SCENARIOS.get(self.active_scenario_key, SCENARIOS["AUTHORIZED_DRONE"])
        self.reports_sent_for_scenario += 1

        report = {
            "source": "SIMULATOR",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "track_id": scenario["track_id"],
            "uas_id": scenario.get("uas_id", scenario["track_id"]),
            "object_type": scenario.get("object_type", "DRONE"),
            "latitude": round(self.current_lat, 6),
            "longitude": round(self.current_lon, 6),
            "altitude_m": round(self.current_alt, 1),
            "speed_mps": round(self.current_speed, 1),
            "heading_deg": round(self.current_heading, 1),
            "scenario": self.active_scenario_key
        }

        if scenario.get("vision_class"):
            report["vision_class"] = scenario["vision_class"]
            report["target_hint_camera"] = scenario["vision_class"]

        ingestion_service.validate_and_ingest(report)

    def get_scenario_state(self) -> Dict[str, Any]:
        scenario = SCENARIOS.get(self.active_scenario_key, SCENARIOS["AUTHORIZED_DRONE"])
        if self.active_scenario_key == "MULTI_OBJECT":
            track_ids = ["DRN-001", "UNKNOWN-UAS-003", "DRN-002"]
        else:
            track_ids = [scenario["track_id"]]

        demo_zones = ["ZONE-TEMP-DEMO"] if self.active_scenario_key == "TEMP_RED_ZONE_VIOLATION" else []

        return {
            "active": self.state == "RUNNING",
            "scenario": self.active_scenario_key,
            "paused": self.state == "PAUSED",
            "speed": self.speed,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "track_ids": track_ids,
            "demo_zone_ids": demo_zones
        }

    def get_snapshot(self) -> Dict[str, Any]:
        scenario = SCENARIOS.get(self.active_scenario_key, SCENARIOS["AUTHORIZED_DRONE"])
        track_id = scenario["track_id"]
        active_t = track_manager.active_tracks.get(track_id, {})

        obj_type = active_t.get("object_type", scenario.get("object_type", "DRONE"))
        intel = self._synthesize_rf_intel(scenario, obj_type, active_t)

        snapshot_track = {
            "track_id": track_id,
            "uas_id": scenario.get("uas_id", track_id),
            "object_type": obj_type,
            "radar_confidence": active_t.get("radar_confidence", 0.96),
            "camera_confidence": active_t.get("camera_confidence", 0.0),
            "fusion_status": active_t.get("fusion_status", "RADAR_ONLY"),
            "display_status": active_t.get("display_status", "TRACKING"),
            "latitude": active_t.get("latitude", self.current_lat),
            "longitude": active_t.get("longitude", self.current_lon),
            "altitude_m": active_t.get("altitude_m", self.current_alt),
            "speed_mps": active_t.get("speed_mps", self.current_speed),
            "heading_deg": active_t.get("heading_deg", self.current_heading),
            "range_m": round(math.sqrt((self.current_lat - 13.065)**2 + (self.current_lon - 80.295)**2) * 111000, 1),
            "status": active_t.get("status", "TRACKING"),
            "authorization": active_t.get("authorization", {}),
            "geofence": active_t.get("geofence", {}),
            "trajectory": active_t.get("trajectory", {}),
            "risk": active_t.get("risk", {}),
            "risk_level": active_t.get("risk_level", "LOW"),
            "risk_reasons": active_t.get("risk_reasons", []),
            "alert_classification": active_t.get("alert_classification", "AUTHORIZED"),
            "alert_subtype": active_t.get("alert_subtype", "COMPLIANT_MISSION"),
            "suggested_action": active_t.get("suggested_action", "MONITOR"),
            "associated_camera": active_t.get("associated_camera"),
            "electronic_intel": intel,
            "history": active_t.get("history", [])
        }

        all_active_tracks = list(track_manager.active_tracks.values())

        return {
            "state": self.state,
            "speed": self.speed,
            "scenario": scenario,
            "active_scenario_key": self.active_scenario_key,
            "scenario_state": self.get_scenario_state(),
            "auto_cycle": self.auto_cycle,
            "step_index": self.step_index,
            "seconds_until_cycle": max(0, self.cycle_interval_steps - (self.step_index % self.cycle_interval_steps)),
            "current_track": snapshot_track,
            "tracks": all_active_tracks,
            "active_tracks": all_active_tracks,
            "ingestion_metrics": track_manager.get_ingestion_metrics(),
            "history_trail": active_t.get("history", []),
            "live_events": self.live_events
        }

    def _synthesize_rf_intel(self, scenario, obj_type, track_state):
        auth_status = track_state.get("authorization", {}).get("status", "UNKNOWN")
        if obj_type == "BIRD":
            return {
                "has_rf_emission": False,
                "rf_band": "NONE (BIOLOGICAL SILENCE)",
                "frequency_mhz": 0.0,
                "signal_strength_dbm": -108,
                "protocol": "NO RF EMISSION",
                "micro_doppler": {"rotor_rpm": 0, "blade_freq_hz": 4.2, "harmonic_count": 1, "rcs_m2": 0.008, "signature_type": "ORGANIC_WING_BEAT"}
            }
        elif obj_type == "AIRCRAFT":
            return {
                "has_rf_emission": True,
                "rf_band": "1090 MHz SSR / ADS-B",
                "frequency_mhz": 1090.0,
                "signal_strength_dbm": -42,
                "protocol": "ADS-B Out (DO-260B Mode-S)",
                "micro_doppler": {"rotor_rpm": 0, "blade_freq_hz": 0, "harmonic_count": 0, "rcs_m2": 45.0, "signature_type": "TURBOFAN_HIGH_RCS"}
            }
        elif auth_status == "AUTHORIZED":
            return {
                "has_rf_emission": True,
                "rf_band": "2.4 GHz ISM (Civil Encrypted)",
                "frequency_mhz": 2412.0,
                "signal_strength_dbm": -55,
                "protocol": "MAVLink v2 / Microhard FHSS",
                "remote_id": {"status": "VERIFIED_DGCA", "uin": scenario.get("uas_id"), "operator_distance_m": 290},
                "micro_doppler": {"rotor_rpm": 4800, "blade_freq_hz": 160.0, "harmonic_count": 4, "rcs_m2": 0.032, "signature_type": "CIVIL_QUADCOPTER_PROP"}
            }
        else:
            return {
                "has_rf_emission": True,
                "rf_band": "2.4 GHz & 5.8 GHz Dual-Band ISM",
                "frequency_mhz": 2437.0,
                "signal_strength_dbm": -68,
                "protocol": "DJI OcuSync 3.0 / Proprietary FHSS",
                "remote_id": {"status": "UNVERIFIED_BROADCAST", "uin": scenario.get("uas_id"), "operator_distance_m": 410},
                "micro_doppler": {"rotor_rpm": 5400, "blade_freq_hz": 180.0, "harmonic_count": 4, "rcs_m2": 0.026, "signature_type": "QUAD_ROTOR_SIDEBANDS"}
            }

simulation_engine = SimulationEngine()
