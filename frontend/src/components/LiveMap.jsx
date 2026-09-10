import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Target, Compass, Eye, Layers, Navigation, AlertTriangle, ShieldAlert, PlusCircle, Check, X, Clock } from 'lucide-react';

export default function LiveMap({
  track,
  tracks = [],
  historyTrail,
  zones,
  cameras,
  selectedCamera,
  onSelectCamera,
  onSelectTrack,
  pinnedTarget,
  onZoneCreated
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapLayer, setMapLayer] = useState('DARK'); // DARK, SATELLITE, STREET
  const [autoTrack, setAutoTrack] = useState(true);
  const [isOffScreen, setIsOffScreen] = useState(false);
  const [incomingNotice, setIncomingNotice] = useState(null);

  // Drawing Temporary Red Zone State
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState([]);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [zoneName, setZoneName] = useState('Tactical Temporary Sector 01');
  const [zoneReason, setZoneReason] = useState('VIP Coastal Convoy Security Perimeter');
  const [zoneDuration, setZoneDuration] = useState(60); // Default 60 seconds for live demo!
  const [zoneMinAlt, setZoneMinAlt] = useState(0);
  const [zoneMaxAlt, setZoneMaxAlt] = useState(120);
  const [isSubmittingZone, setIsSubmittingZone] = useState(false);

  // Timer tick for zone expiry countdowns
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const tileLayerRef = useRef(null);
  const trackMarkerRef = useRef(null);
  const trackMarkersRef = useRef({});
  const trailLineRef = useRef(null);
  const trajectoryLineRef = useRef(null);
  const ingressMarkerRef = useRef(null);
  const ingressLineRef = useRef(null);
  const zonesLayerRef = useRef(null);
  const camerasLayerRef = useRef(null);
  const drawingLayerRef = useRef(null);
  const lastTrackIdRef = useRef(null);

  const TILE_SOURCES = {
    DARK: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        className: 'dark-tiles',
        attribution: '© OpenStreetMap contributors'
      }
    },
    SATELLITE: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      options: {
        maxZoom: 19,
        attribution: 'Esri, Maxar, Earthstar Geographics'
      }
    },
    STREET: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        attribution: '© OpenStreetMap contributors'
      }
    }
  };

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      return;
    }

    const initialCenter = track ? [track.latitude, track.longitude] : [13.068, 80.298];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 14,
      minZoom: 4,
      maxZoom: 19,
      zoomControl: false,
      attributionControl: false
    });

    const src = TILE_SOURCES.DARK;
    tileLayerRef.current = L.tileLayer(src.url, src.options).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstanceRef.current = map;

    // Check bounds on map pan/zoom
    const updateBoundsCheck = () => {
      if (!trackMarkerRef.current || !mapInstanceRef.current) return;
      const targetLatLng = trackMarkerRef.current.getLatLng();
      const inBounds = mapInstanceRef.current.getBounds().contains(targetLatLng);
      setIsOffScreen(!inBounds);
    };

    map.on('moveend', updateBoundsCheck);
    map.on('zoomend', updateBoundsCheck);

    // Map click for drawing polygon vertices
    map.on('click', (e) => {
      // Handled via ref/state in drawing effect
    });

    // Dynamic resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    const timer1 = setTimeout(() => map.invalidateSize(), 150);
    const timer2 = setTimeout(() => map.invalidateSize(), 600);
    const timer3 = setTimeout(() => map.invalidateSize(), 1500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Map Drawing Click Handler
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e) => {
      if (!isDrawing) return;
      const newPt = [roundTo(e.latlng.lat, 6), roundTo(e.latlng.lng, 6)];
      setDrawnPoints((prev) => [...prev, newPt]);
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isDrawing]);

  // Render Live Drawing Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!drawingLayerRef.current) {
      drawingLayerRef.current = L.layerGroup().addTo(map);
    }
    drawingLayerRef.current.clearLayers();

    if (drawnPoints.length > 0) {
      drawnPoints.forEach((pt, idx) => {
        const marker = L.circleMarker(pt, {
          radius: 5,
          color: '#EF4444',
          fillColor: '#FFFFFF',
          fillOpacity: 0.9,
          weight: 2
        });
        drawingLayerRef.current.addLayer(marker);
      });

      if (drawnPoints.length >= 2) {
        const line = L.polyline(drawnPoints, {
          color: '#EF4444',
          dashArray: '5, 5',
          weight: 2
        });
        drawingLayerRef.current.addLayer(line);
      }

      if (drawnPoints.length >= 3) {
        const poly = L.polygon(drawnPoints, {
          color: '#EF4444',
          fillColor: '#EF4444',
          fillOpacity: 0.2,
          weight: 2,
          dashArray: '4, 4'
        });
        drawingLayerRef.current.addLayer(poly);
      }
    }
  }, [drawnPoints]);

  const roundTo = (n, d) => Math.round(n * Math.pow(10, d)) / Math.pow(10, d);

  const startDrawing = () => {
    setIsDrawing(true);
    setDrawnPoints([]);
    setShowZoneModal(false);
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setDrawnPoints([]);
    setShowZoneModal(false);
  };

  const finishDrawing = () => {
    if (drawnPoints.length < 3) {
      alert('Please click at least 3 points on the map to define a closed polygon zone.');
      return;
    }
    setIsDrawing(false);
    setShowZoneModal(true);
  };

  const handleSaveTemporaryZone = async (e) => {
    e.preventDefault();
    if (drawnPoints.length < 3) return;

    setIsSubmittingZone(true);
    try {
      const payload = {
        zone_id: `ZONE-TEMP-${Date.now()}`,
        name: zoneName,
        zone_type: 'TEMPORARY_RED',
        severity: 'CRITICAL',
        min_altitude_m: Number(zoneMinAlt),
        max_altitude_m: Number(zoneMaxAlt),
        duration_seconds: Number(zoneDuration),
        polygon_coords: drawnPoints,
        reason: zoneReason,
        description: `Temporary tactical restriction active for ${zoneDuration}s`
      };

      const res = await fetch('http://127.0.0.1:5000/api/zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer aerosec-officer-token'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setShowZoneModal(false);
        setDrawnPoints([]);
        if (onZoneCreated) onZoneCreated();
      } else {
        alert(`Error creating zone: ${data.error}`);
      }
    } catch (err) {
      console.error('Zone save error:', err);
      alert('Network error saving temporary red zone.');
    } finally {
      setIsSubmittingZone(false);
    }
  };

  // 3. Layer Switching
  const handleLayerSwitch = (layerKey) => {
    const map = mapInstanceRef.current;
    if (!map || !TILE_SOURCES[layerKey]) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const src = TILE_SOURCES[layerKey];
    tileLayerRef.current = L.tileLayer(src.url, src.options).addTo(map);
    setMapLayer(layerKey);
    setTimeout(() => map.invalidateSize(), 100);
  };

  // 4. Immediate Pin Target Action
  const handlePinTarget = () => {
    const map = mapInstanceRef.current;
    if (!map || !track) return;
    map.flyTo([track.latitude, track.longitude], 14, { animate: true, duration: 0.8 });
    setIsOffScreen(false);
  };

  // React to external "PIN TARGET" requests
  useEffect(() => {
    if (!pinnedTarget || !mapInstanceRef.current) return;
    const lat = pinnedTarget.latitude;
    const lon = pinnedTarget.longitude;
    if (lat && lon) {
      mapInstanceRef.current.flyTo([lat, lon], 15, { animate: true, duration: 1.0 });
      setAutoTrack(true);
      setIsOffScreen(false);
    }
  }, [pinnedTarget]);

  // 5. Render Restricted Zones with Live Expiry Countdowns & Expired Styling
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (zonesLayerRef.current) {
      zonesLayerRef.current.clearLayers();
    } else {
      zonesLayerRef.current = L.layerGroup().addTo(map);
    }

    if (zones && zones.length > 0) {
      zones.forEach((z) => {
        const coords = z.polygon_coords;
        if (!coords || coords.length === 0) return;

        // Calculate expiration
        let isExpired = false;
        let remainingSeconds = null;
        if (z.expires_at) {
          const expTime = new Date(z.expires_at.replace('Z', '')).getTime();
          remainingSeconds = Math.max(0, Math.floor((expTime - currentTime) / 1000));
          if (remainingSeconds <= 0 || z.active === 0) {
            isExpired = true;
          }
        } else if (z.active === 0) {
          isExpired = true;
        }

        let color = '#EF4444'; // Red
        if (z.zone_type === 'YELLOW' || z.severity === 'HIGH') color = '#F59E0B';
        if (z.zone_type === 'GREEN' || z.severity === 'MEDIUM') color = '#10B981';

        // Dim expired zones
        if (isExpired) {
          color = '#64748B'; // Muted Slate
        }

        const polygon = L.polygon(coords, {
          color: color,
          weight: isExpired ? 1.5 : (z.zone_type === 'TEMPORARY_RED' ? 2.5 : 2),
          opacity: isExpired ? 0.4 : 0.85,
          fillColor: color,
          fillOpacity: isExpired ? 0.05 : (z.zone_type === 'TEMPORARY_RED' ? 0.22 : 0.15),
          dashArray: isExpired ? '6, 6' : (z.zone_type === 'TEMPORARY_RED' ? '5, 4' : (z.severity === 'CRITICAL' ? '4, 4' : undefined))
        });

        const formatCountdown = (secs) => {
          const m = Math.floor(secs / 60);
          const s = secs % 60;
          return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };

        const countdownBadge = z.expires_at ? (
          isExpired ? (
            `<div style="margin-top: 6px; padding: 3px 6px; border-radius: 4px; background: rgba(100, 116, 139, 0.2); border: 1px solid rgba(100, 116, 139, 0.4); color: #94A3B8; font-weight: bold; font-size: 10px;">
              ⏱️ EXPIRED · No longer enforced (Zero Violations)
            </div>`
          ) : (
            `<div style="margin-top: 6px; padding: 3px 6px; border-radius: 4px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #FCA5A5; font-weight: bold; font-size: 10px; display: flex; align-items: center; justify-content: space-between;">
              <span>⏳ TEMP RED ZONE · ACTIVE</span>
              <span style="font-family: monospace; font-size: 11px;">Expires in: ${formatCountdown(remainingSeconds)}</span>
            </div>`
          )
        ) : '';

        polygon.bindPopup(`
          <div style="font-family: 'Inter', sans-serif; font-size: 11px; min-width: 220px;">
            <div style="font-weight: bold; color: ${color}; margin-bottom: 3px; font-size: 12px;">${z.name}</div>
            <div style="color: #94a3b8; font-size: 10px;">Classification: <strong>${z.zone_type}</strong></div>
            <div style="color: #94a3b8; font-size: 10px;">Ceiling Envelope: ${z.min_altitude_m}m - ${z.max_altitude_m}m AGL</div>
            <div style="color: #cbd5e1; margin-top: 4px;">${z.reason || z.description || ''}</div>
            ${countdownBadge}
          </div>
        `);

        zonesLayerRef.current.addLayer(polygon);
      });
    }
  }, [zones, currentTime]);

  // 6. Render Cameras & FOV Cones
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (camerasLayerRef.current) {
      camerasLayerRef.current.clearLayers();
    } else {
      camerasLayerRef.current = L.layerGroup().addTo(map);
    }

    if (cameras && cameras.length > 0) {
      cameras.forEach((cam) => {
        const isSelected = selectedCamera && selectedCamera.camera_id === cam.camera_id;

        const camIcon = L.divIcon({
          className: 'custom-cam-icon',
          html: `
            <div style="
              background: ${isSelected ? '#38BDF8' : '#1E293B'};
              border: 2px solid #38BDF8;
              border-radius: 50%;
              width: 24px;
              height: 24px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 0 12px rgba(56, 189, 248, 0.6);
              cursor: pointer;
            ">
              <span style="font-size: 12px;">📹</span>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const marker = L.marker([cam.latitude, cam.longitude], { icon: camIcon });
        marker.on('click', () => {
          if (onSelectCamera) onSelectCamera(cam);
        });
        marker.bindPopup(`
          <div style="font-family: 'Inter', sans-serif; font-size: 11px;">
            <div style="font-weight: bold; color: #38BDF8;">${cam.name} (${cam.camera_id})</div>
            <div style="color: #94a3b8; font-size: 10px;">Range: ${cam.coverage_radius_m}m | Azimuth: ${cam.heading_deg}°</div>
            <div style="color: #10B981; font-weight: 600; margin-top: 2px;">STATUS: ${cam.status}</div>
          </div>
        `);
        camerasLayerRef.current.addLayer(marker);

        // Draw Optical FOV Cone
        const r_m = cam.coverage_radius_m;
        const heading = cam.heading_deg;
        const half_fov = cam.fov_deg / 2.0;

        const conePts = [[cam.latitude, cam.longitude]];
        const steps = 10;
        for (let i = 0; i <= steps; i++) {
          const ang = (heading - half_fov) + (i * cam.fov_deg / steps);
          const rad = (ang * Math.PI) / 180.0;
          const dN = r_m * Math.cos(rad);
          const dE = r_m * Math.sin(rad);
          const lat = cam.latitude + (dN / 111000.0);
          const lon = cam.longitude + (dE / (111000.0 * Math.cos((cam.latitude * Math.PI) / 180.0)));
          conePts.push([lat, lon]);
        }
        conePts.push([cam.latitude, cam.longitude]);

        const cone = L.polygon(conePts, {
          color: '#38BDF8',
          weight: 1,
          dashArray: '2, 3',
          fillColor: '#38BDF8',
          fillOpacity: isSelected ? 0.18 : 0.06
        });
        camerasLayerRef.current.addLayer(cone);
      });
    }
  }, [cameras, selectedCamera]);

  // 7. Track Updates & Symbology (Multi-track & single track support)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const displayTracks = (tracks && tracks.length > 0) ? tracks : (track ? [track] : []);
    if (displayTracks.length === 0) {
      Object.values(trackMarkersRef.current).forEach((m) => map.removeLayer(m));
      trackMarkersRef.current = {};
      if (trailLineRef.current) trailLineRef.current.setLatLngs([]);
      if (trajectoryLineRef.current) trajectoryLineRef.current.setLatLngs([]);
      return;
    }

    const currentTrackIds = new Set(displayTracks.map((t) => t.track_id));

    // Remove old markers that are no longer active
    Object.keys(trackMarkersRef.current).forEach((tid) => {
      if (!currentTrackIds.has(tid)) {
        map.removeLayer(trackMarkersRef.current[tid]);
        delete trackMarkersRef.current[tid];
      }
    });

    // Primary/Selected track for autoTrack, ingress, and breadcrumbs
    const activeSelectedTrack = track || displayTracks[0];

    // Detect new incoming target on primary track
    if (activeSelectedTrack && lastTrackIdRef.current !== activeSelectedTrack.track_id) {
      lastTrackIdRef.current = activeSelectedTrack.track_id;
      setIncomingNotice({ trackId: activeSelectedTrack.track_id, type: activeSelectedTrack.object_type });
      setTimeout(() => setIncomingNotice(null), 4000);

      // Save ingress pin
      if (ingressMarkerRef.current) map.removeLayer(ingressMarkerRef.current);
      if (ingressLineRef.current) map.removeLayer(ingressLineRef.current);

      const ingressIcon = L.divIcon({
        className: 'ingress-pin',
        html: `
          <div style="background: #1E293B; border: 2px solid #38BDF8; color: #38BDF8; font-weight: bold; font-size: 10px; padding: 2px 6px; border-radius: 4px; box-shadow: 0 0 10px rgba(56, 189, 248, 0.5); white-space: nowrap;">
            📍 INGRESS: ${activeSelectedTrack.track_id}
          </div>
        `,
        iconAnchor: [0, 20]
      });
      ingressMarkerRef.current = L.marker([activeSelectedTrack.latitude, activeSelectedTrack.longitude], { icon: ingressIcon }).addTo(map);

      if (autoTrack) {
        map.flyTo([activeSelectedTrack.latitude, activeSelectedTrack.longitude], 14, { animate: true, duration: 1.0 });
        setIsOffScreen(false);
      }
    }

    if (activeSelectedTrack) {
      if (autoTrack) {
        map.panTo([activeSelectedTrack.latitude, activeSelectedTrack.longitude], { animate: true, duration: 0.5 });
        setIsOffScreen(false);
      } else {
        const inBounds = map.getBounds().contains([activeSelectedTrack.latitude, activeSelectedTrack.longitude]);
        setIsOffScreen(!inBounds);
      }
    }

    // Render each track marker
    displayTracks.forEach((t) => {
      const isSelected = activeSelectedTrack && activeSelectedTrack.track_id === t.track_id;
      const lat = t.latitude;
      const lon = t.longitude;

      let markerColor = '#10B981'; // Authorized
      let symbol = '🛸';
      if (t.object_type === 'BIRD') {
        symbol = '🦅';
        markerColor = '#38BDF8';
      } else if (t.object_type === 'AIRCRAFT') {
        symbol = '✈️';
        markerColor = '#818CF8';
      }

      if (t.alert_classification === 'OUT_OF_ENVELOPE' || t.risk_level === 'CRITICAL' || t.risk?.level === 'CRITICAL') {
        markerColor = '#EF4444';
      } else if (t.alert_classification === 'UNREGISTERED' || t.risk_level === 'HIGH' || t.risk?.level === 'HIGH') {
        markerColor = '#F59E0B';
      } else if (t.alert_classification === 'LOST_LINK') {
        markerColor = '#A855F7';
      }

      const ringStyle = isSelected
        ? `box-shadow: 0 0 16px ${markerColor}, 0 0 0 3px rgba(255,255,255,0.85);`
        : `box-shadow: 0 0 14px ${markerColor};`;

      const iconHtml = `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <div style="
            position: absolute;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 2px solid ${markerColor};
            background: rgba(15, 23, 42, 0.85);
            ${ringStyle}
            display: flex;
            align-items: center;
            justify-content: center;
            transform: rotate(${t.heading_deg || 0}deg);
          ">
            <span style="font-size: 14px;">${symbol}</span>
          </div>
          <div style="
            position: absolute;
            top: -18px;
            background: #0F172A;
            color: ${markerColor};
            font-family: monospace;
            font-size: 9px;
            font-weight: bold;
            padding: 1px 4px;
            border-radius: 3px;
            border: 1px solid ${markerColor};
            white-space: nowrap;
          ">
            ${t.track_id}
          </div>
        </div>
      `;

      const targetIcon = L.divIcon({
        className: 'target-marker',
        html: iconHtml,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      if (trackMarkersRef.current[t.track_id]) {
        trackMarkersRef.current[t.track_id].setLatLng([lat, lon]);
        trackMarkersRef.current[t.track_id].setIcon(targetIcon);
      } else {
        const marker = L.marker([lat, lon], { icon: targetIcon }).addTo(map);
        marker.on('click', () => {
          if (onSelectTrack) onSelectTrack(t);
        });
        trackMarkersRef.current[t.track_id] = marker;
      }
    });

    // Historical Breadcrumbs Trail
    const trail = (activeSelectedTrack?.history && activeSelectedTrack.history.length > 0)
      ? activeSelectedTrack.history
      : (historyTrail || []);

    if (trail && trail.length > 0) {
      if (trailLineRef.current) {
        trailLineRef.current.setLatLngs(trail);
      } else {
        trailLineRef.current = L.polyline(trail, {
          color: '#38BDF8',
          weight: 2,
          opacity: 0.6,
          dashArray: '3, 4'
        }).addTo(map);
      }
    }

    // 30-Second Forward Kinematic Trajectory
    const projPts = activeSelectedTrack?.trajectory?.predicted_points;
    if (projPts && projPts.length > 0) {
      const trajCoords = [[activeSelectedTrack.latitude, activeSelectedTrack.longitude], ...projPts.map((p) => [p.latitude, p.longitude])];
      if (trajectoryLineRef.current) {
        trajectoryLineRef.current.setLatLngs(trajCoords);
      } else {
        trajectoryLineRef.current = L.polyline(trajCoords, {
          color: '#F59E0B',
          weight: 2,
          dashArray: '4, 4',
          opacity: 0.8
        }).addTo(map);
      }
    } else if (trajectoryLineRef.current) {
      trajectoryLineRef.current.setLatLngs([]);
    }
  }, [track, tracks, autoTrack, historyTrail]);

  return (
    <div className="relative w-full h-full bg-aerodark-950 overflow-hidden font-sans select-none">
      {/* Map DOM Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" style={{ background: '#0B1120' }} />

      {/* Top Left: Title Badge */}
      <div className="absolute top-3 left-3 z-10 space-y-1.5 pointer-events-none">
        <div className="bg-aerodark-900/90 backdrop-blur-md border border-aerodark-700/80 px-3 py-2 rounded text-xs font-mono shadow-xl pointer-events-auto">
          <div className="flex items-center space-x-2 text-aerocyan-400 font-bold tracking-wider">
            <span className="w-2 h-2 rounded-full bg-aerocyan-400 animate-ping"></span>
            <span>COASTAL RADAR & OPTICAL COVERAGE</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">OPENSTREETMAP LIVE ENGINE · CHENNAI SECTOR</div>

          {track && (
            <div className="mt-1.5 pt-1.5 border-t border-aerodark-700/60 flex items-center justify-between space-x-2 text-[10px]">
              <span className="text-slate-400">PINNED TARGET:</span>
              <span className="font-bold text-aerocyan-300">
                {track.track_id} ({track.object_type})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Top Center: Off-Screen Warning Banner */}
      {isOffScreen && track && (
        <div
          onClick={handlePinTarget}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 px-3.5 py-1.5 rounded-lg text-xs font-sans font-medium shadow-lg flex items-center space-x-2.5 cursor-pointer transition-all"
        >
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>INCOMING TARGET ({track.track_id}) IS OFF-SCREEN · CLICK TO PIN</span>
          <span className="bg-red-600 text-white font-semibold px-2 py-0.5 rounded text-[10px]">
            PIN
          </span>
        </div>
      )}

      {/* Top Center: Drawing Active Banner */}
      {isDrawing && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-sans font-semibold shadow-2xl flex items-center space-x-3 border border-red-400 animate-pulse">
          <span>📍 CLICK MAP TO ADD GEOFENCE VERTICES ({drawnPoints.length} added)</span>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={finishDrawing}
              disabled={drawnPoints.length < 3}
              className="bg-white text-red-600 disabled:opacity-50 px-2.5 py-1 rounded text-xs font-bold hover:bg-slate-100 cursor-pointer"
            >
              COMPLETE ZONE
            </button>
            <button
              onClick={cancelDrawing}
              className="bg-red-800 text-slate-200 px-2.5 py-1 rounded text-xs hover:bg-red-900 cursor-pointer"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      {/* Top Right Controls Bar */}
      <div className="absolute top-3 right-3 z-10 flex items-center space-x-2 font-sans text-xs">
        {/* CREATE TEMPORARY RED ZONE BUTTON */}
        {!isDrawing ? (
          <button
            onClick={startDrawing}
            title="Draw polygon directly on Leaflet map to establish temporary restricted airspace"
            className="bg-red-600/90 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg font-medium transition-all shadow-sm flex items-center space-x-1.5 border border-red-400/40 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>CREATE TEMP RED ZONE</span>
          </button>
        ) : null}

        {/* Auto-Track Toggle Button */}
        <button
          onClick={() => setAutoTrack(!autoTrack)}
          title="Automatically tracks and keeps the incoming target in viewport"
          className={`px-3 py-1.5 rounded-lg font-medium transition-all shadow-sm flex items-center space-x-1.5 border cursor-pointer ${
            autoTrack
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : 'bg-aerodark-900/90 text-slate-400 border-aerodark-700 hover:text-slate-200'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>{autoTrack ? 'AUTO-TRACK: ON' : 'AUTO-TRACK: OFF'}</span>
        </button>

        {/* Pin Target Button */}
        <button
          onClick={handlePinTarget}
          title="Immediately centers and zooms to the incoming target"
          className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-medium transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
        >
          <span>📍 PIN TARGET</span>
        </button>

        {/* Map Layers Switcher */}
        <div className="bg-aerodark-900/90 backdrop-blur-md border border-aerodark-700 p-1 rounded-lg shadow-md flex items-center space-x-1">
          <button
            onClick={() => handleLayerSwitch('DARK')}
            className={`px-2.5 py-0.5 rounded-md font-medium text-xs transition-all cursor-pointer ${
              mapLayer === 'DARK' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            DARK
          </button>
          <button
            onClick={() => handleLayerSwitch('SATELLITE')}
            className={`px-2.5 py-0.5 rounded-md font-medium text-xs transition-all cursor-pointer ${
              mapLayer === 'SATELLITE' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SATELLITE
          </button>
          <button
            onClick={() => handleLayerSwitch('STREET')}
            className={`px-2.5 py-0.5 rounded-md font-medium text-xs transition-all cursor-pointer ${
              mapLayer === 'STREET' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            STREET
          </button>
        </div>
      </div>

      {/* Temporary Zone Configuration Modal */}
      {showZoneModal && (
        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4 font-sans text-xs">
            <div className="flex items-center justify-between border-b border-aerodark-700 pb-3">
              <div className="flex items-center space-x-2 text-red-400 font-bold text-sm">
                <ShieldAlert className="w-5 h-5" />
                <span>CONFIRM TEMPORARY RED ZONE</span>
              </div>
              <button onClick={cancelDrawing} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTemporaryZone} className="space-y-3.5">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Zone Name</label>
                <input
                  type="text"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  className="w-full bg-aerodark-900 border border-aerodark-700 rounded px-3 py-1.5 text-slate-100 outline-none focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Operational Reason</label>
                <input
                  type="text"
                  value={zoneReason}
                  onChange={(e) => setZoneReason(e.target.value)}
                  className="w-full bg-aerodark-900 border border-aerodark-700 rounded px-3 py-1.5 text-slate-100 outline-none focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Active Duration (Expiry Countdown)</label>
                <div className="grid grid-cols-4 gap-2 mb-1.5">
                  {[
                    { label: '60s (Demo)', val: 60 },
                    { label: '5 min', val: 300 },
                    { label: '15 min', val: 900 },
                    { label: '1 hour', val: 3600 }
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setZoneDuration(preset.val)}
                      className={`px-2 py-1 rounded text-center font-medium border cursor-pointer ${
                        zoneDuration === preset.val
                          ? 'bg-red-600 text-white border-red-500'
                          : 'bg-aerodark-900 text-slate-300 border-aerodark-700 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400">Custom seconds:</span>
                  <input
                    type="number"
                    min="10"
                    max="86400"
                    value={zoneDuration}
                    onChange={(e) => setZoneDuration(Number(e.target.value))}
                    className="w-24 bg-aerodark-900 border border-aerodark-700 rounded px-2 py-1 text-slate-100 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Min Altitude (m AGL)</label>
                  <input
                    type="number"
                    value={zoneMinAlt}
                    onChange={(e) => setZoneMinAlt(Number(e.target.value))}
                    className="w-full bg-aerodark-900 border border-aerodark-700 rounded px-2 py-1.5 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Max Altitude (m AGL)</label>
                  <input
                    type="number"
                    value={zoneMaxAlt}
                    onChange={(e) => setZoneMaxAlt(Number(e.target.value))}
                    className="w-full bg-aerodark-900 border border-aerodark-700 rounded px-2 py-1.5 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded bg-aerodark-900 border border-aerodark-700 text-slate-400 text-[11px] leading-relaxed">
                <span className="text-amber-400 font-semibold">AUTOMATIC EXPIRY GUARANTEE:</span> At the end of {zoneDuration} seconds, this temporary restriction will automatically deactivate on the backend and map, stopping all violation alerts.
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-aerodark-700">
                <button
                  type="button"
                  onClick={cancelDrawing}
                  className="px-3 py-1.5 rounded-lg border border-aerodark-700 text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingZone}
                  className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold px-4 py-1.5 rounded-lg shadow-md cursor-pointer flex items-center space-x-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSubmittingZone ? 'ACTIVATING...' : 'ACTIVATE RED ZONE'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Left: Tactical Symbology Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-aerodark-900/90 backdrop-blur-md border border-aerodark-700 px-3 py-2.5 rounded-lg text-xs font-sans shadow-md space-y-1.5">
        <div className="text-slate-400 font-semibold text-[11px] mb-1 uppercase tracking-wider">MAP SYMBOLOGY</div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          <span className="text-slate-300 text-[11px]">Authorized Flight</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
          <span className="text-slate-300 text-[11px]">Warning / Unknown</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
          <span className="text-slate-300 text-[11px]">Restricted Zone Breach</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
          <span className="text-slate-300 text-[11px]">Lost Link Telemetry</span>
        </div>
        <div className="flex items-center space-x-2 pt-0.5">
          <span className="w-4 h-0.5 border-t-2 border-dashed border-aeroamber-400"></span>
          <span className="text-slate-300">Forward Trajectory (30s)</span>
        </div>
      </div>
    </div>
  );
}
