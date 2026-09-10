import math
import json
from typing import List, Tuple, Dict, Any, Optional

R_EARTH_M = 6371000.0

def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return R_EARTH_M * c

def point_in_polygon(lat: float, lon: float, polygon: List[List[float]]) -> bool:
    """
    Ray-casting point-in-polygon test.
    Accepts polygon formatted as list of [lat, lon] or [lon, lat] pairs.
    """
    if not polygon or len(polygon) < 3:
        return False

    # Normalize coords if passed as GeoJSON [lon, lat] vs standard Leaflet [lat, lon]
    # Check if coords are [lat, lon] (lat in [-90, 90], lon in [-180, 180])
    p1 = polygon[0]
    n = len(polygon)
    inside = False

    p1x, p1y = p1[0], p1[1]
    for i in range(n + 1):
        p2 = polygon[i % n]
        p2x, p2y = p2[0], p2[1]
        if min(p1y, p2y) < lon <= max(p1y, p2y):
            if lat <= max(p1x, p2x):
                if p1y != p2y:
                    xinters = (lon - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                if p1x == p2x or lat <= xinters:
                    inside = not inside
        p1x, p1y = p2x, p2y

    return inside

def min_distance_to_polygon_m(lat: float, lon: float, polygon: List[List[float]]) -> float:
    if not polygon:
        return float('inf')
    return min(haversine_distance_m(lat, lon, pt[0], pt[1]) for pt in polygon)

def validate_geojson_geometry(geometry: Dict[str, Any]) -> Tuple[bool, Optional[str], Optional[List[List[float]]]]:
    """
    Validates GeoJSON Geometry and extracts standard [lat, lon] polygon coordinates.
    """
    if not isinstance(geometry, dict):
        return False, "Geometry must be a JSON object", None

    g_type = geometry.get("type", "").upper()
    coords = geometry.get("coordinates")

    if not coords or not isinstance(coords, list):
        return False, "Geometry coordinates missing or invalid", None

    if g_type == "POLYGON":
        # GeoJSON Polygon coords are [ [ [lon, lat], [lon, lat], ... ] ]
        outer_ring = coords[0]
        if len(outer_ring) < 3:
            return False, "Polygon outer ring must have at least 3 vertices", None
        # Convert GeoJSON [lon, lat] to Leaflet [lat, lon]
        converted = []
        for pt in outer_ring:
            if len(pt) < 2:
                return False, "Coordinate tuple must have at least 2 elements [lon, lat]", None
            lon, lat = float(pt[0]), float(pt[1])
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                return False, f"Coordinates out of bounds: lat={lat}, lon={lon}", None
            converted.append([lat, lon])
        return True, None, converted

    elif g_type == "MULTIPOLYGON":
        # First polygon outer ring
        first_poly = coords[0][0]
        converted = []
        for pt in first_poly:
            lon, lat = float(pt[0]), float(pt[1])
            converted.append([lat, lon])
        return True, None, converted

    return False, f"Unsupported geometry type: {g_type}. Expected Polygon or MultiPolygon.", None

def parse_geojson_zones(geojson_data: Dict[str, Any], default_creator: str = "OFFICER") -> Tuple[bool, List[Dict[str, Any]], Optional[str]]:
    """
    Parses a GeoJSON payload (FeatureCollection or single Feature) into database-ready zone records.
    """
    if not isinstance(geojson_data, dict):
        return False, [], "GeoJSON root must be a dictionary object"

    root_type = geojson_data.get("type", "").upper()
    features = []

    if root_type == "FEATURECOLLECTION":
        raw_features = geojson_data.get("features", [])
        if not raw_features:
            return False, [], "FeatureCollection contains zero features"
        features = raw_features
    elif root_type == "FEATURE":
        features = [geojson_data]
    elif root_type in ["POLYGON", "MULTIPOLYGON"]:
        features = [{"type": "Feature", "geometry": geojson_data, "properties": {}}]
    else:
        return False, [], f"Invalid GeoJSON root type: {root_type}"

    parsed_zones = []
    for idx, feat in enumerate(features):
        geom = feat.get("geometry", {})
        valid, err, poly_coords = validate_geojson_geometry(geom)
        if not valid:
            return False, [], f"Feature [{idx}] validation failed: {err}"

        props = feat.get("properties", {}) or {}
        zone_id = props.get("zone_id") or f"ZONE-IMPORT-{idx+1:03d}"
        name = props.get("name") or f"Imported GeoJSON Zone {idx+1}"
        
        # Zone type mapping: GREEN, YELLOW, RED, TEMPORARY_RED
        z_type = str(props.get("zone_type", "RED")).upper()
        if z_type not in ["GREEN", "YELLOW", "RED", "TEMPORARY_RED", "RESTRICTED", "MILITARY_RESTRICTED"]:
            z_type = "RED"

        severity = props.get("severity") or ("CRITICAL" if z_type == "RED" else ("HIGH" if z_type == "YELLOW" else "MEDIUM"))
        min_alt = float(props.get("min_altitude_m", props.get("min_altitude", 0.0)))
        max_alt = float(props.get("max_altitude_m", props.get("max_altitude", 150.0)))
        desc = props.get("description", "Imported via GeoJSON boundary definition")
        reason = props.get("reason", "GeoJSON Airspace Classification Layer")

        parsed_zones.append({
            "zone_id": zone_id,
            "name": name,
            "zone_type": z_type,
            "min_altitude_m": min_alt,
            "max_altitude_m": max_alt,
            "polygon_coords": poly_coords,
            "severity": severity,
            "description": desc,
            "expires_at": props.get("expires_at", None),
            "created_by": default_creator,
            "active": 1,
            "reason": reason
        })

    return True, parsed_zones, None
