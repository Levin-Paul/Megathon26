import math
from db import get_db
from rules_engine import haversine_distance_m

def calculate_bearing_deg(lat1, lon1, lat2, lon2):
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)
    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)
    theta = math.atan2(y, x)
    return (math.degrees(theta) + 360.0) % 360.0

class FusionEngine:
    def __init__(self):
        pass

    def check_camera_coverage(self, track_lat, track_lon):
        """
        Determines which camera (if any) currently has the track in its optical field of view.
        """
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM camera_devices WHERE status = 'ACTIVE'")
        cameras = cursor.fetchall()
        conn.close()

        candidate = None
        min_dist = 999999.0

        for cam in cameras:
            dist = haversine_distance_m(cam["latitude"], cam["longitude"], track_lat, track_lon)
            if dist <= cam["coverage_radius_m"]:
                # Check azimuth angle vs camera heading and FOV
                bearing = calculate_bearing_deg(cam["latitude"], cam["longitude"], track_lat, track_lon)
                half_fov = cam["fov_deg"] / 2.0
                angle_diff = abs((bearing - cam["heading_deg"] + 180.0) % 360.0 - 180.0)
                if angle_diff <= half_fov:
                    if dist < min_dist:
                        min_dist = dist
                        candidate = {
                            "camera_id": cam["camera_id"],
                            "camera_name": cam["name"],
                            "distance_m": round(dist, 1),
                            "stream_type": cam["stream_type"],
                            "in_fov": True
                        }

        return candidate

    def correlate(self, radar_class, radar_confidence, track_lat, track_lon, camera_result, camera_info):
        """
        Rigorous Sensor Fusion layer comparing Radar and Optical YOLO detections.
        """
        if not camera_info:
            return {
                "fusion_status": "RADAR_ONLY",
                "display_status": "RADAR TRACK ACTIVE (OUT OF OPTICAL RANGE)",
                "correlation_badge": "RADAR ONLY",
                "associated_camera": None,
                "fused_confidence": radar_confidence,
                "primary_class": radar_class,
                "conflict": False,
                "detail": "Target is outside all coastal EO/IR optical camera coverage zones."
            }

        cam_id = camera_info["camera_id"]

        # If camera inference has detections
        detections = camera_result.get("detections", [])
        inference_source = camera_result.get("inference_source", "")

        if not detections:
            return {
                "fusion_status": "OPTICAL_SEARCHING",
                "display_status": f"CUED TO {cam_id} — TARGET NOT RESOLVED IN OPTICAL FEED",
                "correlation_badge": "SEARCHING",
                "associated_camera": camera_info,
                "fused_confidence": radar_confidence * 0.85,
                "primary_class": radar_class,
                "conflict": False,
                "detail": f"Target is within {cam_id} coverage zone, but optical YOLO has not isolated target."
            }

        top_det = detections[0]
        cam_class = top_det["class_name"].upper()
        cam_conf = top_det["confidence"]

        # Check class agreement
        r_cls = radar_class.upper()
        is_agreement = False
        if ("DRONE" in r_cls and "DRONE" in cam_class) or \
           ("BIRD" in r_cls and "BIRD" in cam_class) or \
           ("AIRCRAFT" in r_cls and ("AIR" in cam_class or "PLANE" in cam_class)) or \
           ("HELICOPTER" in r_cls and "HELI" in cam_class):
            is_agreement = True

        if is_agreement:
            fused_conf = (radar_confidence * 0.5) + (cam_conf * 0.5)
            badge_text = "RADAR + CAMERA CORRELATED"
            if "DEMO" in inference_source:
                badge_text += " (DEMO FEED)"
            return {
                "fusion_status": "CORRELATED",
                "display_status": badge_text,
                "correlation_badge": "CORRELATED",
                "associated_camera": camera_info,
                "camera_class": cam_class,
                "camera_confidence": cam_conf,
                "fused_confidence": round(fused_conf, 3),
                "primary_class": radar_class,
                "conflict": False,
                "inference_source": inference_source,
                "detail": f"Sensor fusion confirmed: Micro-Doppler signature matches optical visual profile with {cam_conf * 100:.1f}% visual confidence."
            }
        else:
            # Classification conflict!
            return {
                "fusion_status": "CLASSIFICATION_CONFLICT",
                "secondary_condition": "VISION_RADAR_CONFLICT",
                "conflict_type": "VISION_RADAR_CONFLICT",
                "display_status": f"VISION_RADAR_CONFLICT (Radar: {radar_class} vs Cam: {cam_class})",
                "correlation_badge": "CONFLICT",
                "associated_camera": camera_info,
                "camera_class": cam_class,
                "camera_confidence": cam_conf,
                "fused_confidence": radar_confidence,
                "primary_class": radar_class,
                "conflict": True,
                "inference_source": inference_source,
                "detail": f"ALERT: Radar classifies target as {radar_class} ({radar_confidence*100:.1f}%), but camera YOLO classifies as {cam_class} ({cam_conf*100:.1f}%). Officer review required."
            }

fusion_engine = FusionEngine()
