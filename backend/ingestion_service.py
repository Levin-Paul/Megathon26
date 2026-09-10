from datetime import datetime, timezone
from typing import Dict, Any, Tuple
from track_manager import track_manager

class IngestionService:
    def __init__(self):
        pass

    def validate_and_ingest(self, data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any], int]:
        """
        Validates Track-A Telemetry Payload:
        {
            "source": "REMOTE_ID_SIM",
            "timestamp": "2026-09-10T18:00:00Z",
            "track_id": "RID-001",
            "uas_id": "UIN-2026-IND-0101",
            "latitude": 13.068,
            "longitude": 80.298,
            "altitude_m": 84,
            "speed_mps": 14,
            "heading_deg": 42
        }
        """
        if not isinstance(data, dict):
            return False, {"error": "Payload must be a JSON dictionary object."}, 400

        # Required fields
        for field in ["track_id", "latitude", "longitude"]:
            if field not in data or data[field] is None:
                return False, {"error": f"Missing required telemetry field: '{field}'"}, 422

        track_id = str(data["track_id"]).strip()
        if not track_id:
            return False, {"error": "Field 'track_id' cannot be empty."}, 422

        # Validate Coordinate Ranges
        try:
            lat = float(data["latitude"])
            lon = float(data["longitude"])
            if not (-90.0 <= lat <= 90.0):
                return False, {"error": f"Latitude {lat} is out of valid range [-90.0, 90.0]."}, 422
            if not (-180.0 <= lon <= 180.0):
                return False, {"error": f"Longitude {lon} is out of valid range [-180.0, 180.0]."}, 422
        except (ValueError, TypeError):
            return False, {"error": "Latitude and longitude must be valid floating-point numbers."}, 422

        # Validate Altitude
        try:
            alt = float(data.get("altitude_m", 50.0))
            if not (-50.0 <= alt <= 20000.0):
                return False, {"error": f"Altitude {alt}m is out of plausible aerospace envelope [-50m, 20000m]."}, 422
        except (ValueError, TypeError):
            return False, {"error": "Altitude must be a valid number."}, 422

        # Validate Speed
        try:
            speed = float(data.get("speed_mps", 0.0))
            if speed < 0:
                return False, {"error": "Speed (m/s) cannot be negative."}, 422
        except (ValueError, TypeError):
            return False, {"error": "Speed must be a valid number."}, 422

        # Validate Heading
        try:
            heading = float(data.get("heading_deg", 0.0))
            if not (0.0 <= heading <= 360.0):
                heading = heading % 360.0
        except (ValueError, TypeError):
            return False, {"error": "Heading must be a valid number in degrees."}, 422

        # Ingest into TrackManager
        clean_report = {
            "track_id": track_id,
            "uas_id": str(data.get("uas_id", track_id)).strip(),
            "source": str(data.get("source", "REMOTE_ID_SIM")).strip(),
            "timestamp": data.get("timestamp", datetime.now(timezone.utc).isoformat()),
            "latitude": lat,
            "longitude": lon,
            "altitude_m": alt,
            "speed_mps": speed,
            "heading_deg": heading,
            "object_type": data.get("object_type", "DRONE")
        }

        track_state = track_manager.process_telemetry_report(clean_report)

        return True, {
            "success": True,
            "track_id": track_id,
            "uas_id": clean_report["uas_id"],
            "status": track_state.get("status", "TRACKING"),
            "alert_classification": track_state.get("alert_classification"),
            "alert_subtype": track_state.get("alert_subtype"),
            "suggested_action": track_state.get("suggested_action"),
            "track": track_state,
            "latency_ms": track_manager.last_latency_ms
        }, 200

ingestion_service = IngestionService()
