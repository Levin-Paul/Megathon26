import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, Tooltip, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { api, API_BASE } from './api/client';
import './App.css';

/* ── Status colors + labels (Phase 13) ── */
const STATUS_COLOR: Record<string, string> = {
  AUTHORIZED: '#2ea043',
  UNREGISTERED: '#f0883e',
  OUT_OF_ENVELOPE: '#f85149',
  LOST_LINK: '#bc8cff',
};
const STATUS_LABEL: Record<string, string> = {
  AUTHORIZED: 'AUTHORIZED',
  UNREGISTERED: 'UNREGISTERED',
  OUT_OF_ENVELOPE: 'OUT OF ENVELOPE',
  LOST_LINK: 'LOST LINK',
};
const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: '#f85149',
  HIGH: '#f0883e',
  MEDIUM: '#d29922',
  LOW: '#3fb950',
};
const ZONE_STYLE: Record<string, { color: string; fill: string }> = {
  RED: { color: '#f85149', fill: 'rgba(248,81,73,0.12)' },
  YELLOW: { color: '#d29922', fill: 'rgba(210,153,34,0.10)' },
  GREEN: { color: '#2ea043', fill: 'rgba(46,160,67,0.08)' },
};
const REASON_CODES = [
  'AUTHORIZED ACTIVITY', 'FALSE POSITIVE', 'VERIFIED VIOLATION',
  'LOST TELEMETRY', 'OPERATOR REVIEW', 'OTHER',
];
const PRIORITY_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function useInterval(cb: () => void, ms: number | null) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    if (ms === null) return;
    const iv = setInterval(() => ref.current(), ms);
    return () => clearInterval(iv);
  }, [ms]);
}

/* ── Map click capture for drawing temporary zones ── */
function MapClickCapture({ onClick, enabled }: { onClick: (lat: number, lon: number) => void; enabled: boolean }) {
  useMapEvents({
    click(e) {
      if (enabled) onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/* ═══════════════════ MAIN APP ═══════════════════ */
export default function App() {
  const [health, setHealth] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [authRegistry, setAuthRegistry] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [dispoAlert, setDispoAlert] = useState<any>(null);
  const [dispoAction, setDispoAction] = useState<string>('CONFIRM');
  const [dispoReason, setDispoReason] = useState<string>('VERIFIED VIOLATION');
  const [toast, setToast] = useState<string>('');

  // Draw-temporary-zone state
  const [drawMode, setDrawMode] = useState(false);
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [zoneName, setZoneName] = useState('TEMP RED ZONE 1');
  const [zoneDuration, setZoneDuration] = useState(300);
  const [zoneMaxAlt, setZoneMaxAlt] = useState(400);
  const [zoneMinAlt, setZoneMinAlt] = useState(0);
  const [busy, setBusy] = useState(false);

  const role = 'OPERATOR'; // demo identity (Phase 18): actions still attributed backend-side

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      const [t, z, a, m] = await Promise.all([
        api.tracks(), api.zones(), api.alerts(), api.metrics(),
      ]);
      setTracks(t.tracks || []);
      setZones(z.zones || []);
      setAlerts(a.alerts || []);
      setMetrics(m);
    } catch { /* backend offline; keep last state */ }
  }, []);

  const refreshSlow = useCallback(async () => {
    try {
      const [h, au, reg] = await Promise.all([
        api.health(), api.audit(100), api.authorization(),
      ]);
      setHealth(h);
      setAudit(au.records || []);
      setAuthRegistry(reg);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { refreshAll(); refreshSlow(); }, [refreshAll, refreshSlow]);
  useInterval(refreshAll, 1500);
  useInterval(refreshSlow, 5000);

  const selected = tracks.find((t) => t.track_id === selectedTrackId) || null;
  const openAlerts = alerts
    .filter((a) => a.status === 'OPEN' || a.status === 'ESCALATED')
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.timestamp - a.timestamp);
  const nowS = Date.now() / 1000;

  /* ── Actions ── */
  const doSpawn = async (kind: 'AUTHORIZED' | 'UNREGISTERED' | 'VIOLATOR') => {
    setBusy(true);
    try { await api.demoSpawn(kind); await refreshAll(); flash(`Spawned ${kind}`); }
    catch (e: any) { flash(e.message); }
    setBusy(false);
  };

  const doRandomize = async () => {
    setBusy(true);
    try { await api.demoRandomize(); await refreshAll(); flash('Airspace randomized'); }
    catch (e: any) { flash(e.message); }
    setBusy(false);
  };

  const doClear = async () => {
    setBusy(true);
    try { await api.demoClear(); setSelectedTrackId(null); await refreshAll(); flash('Tracks cleared'); }
    catch (e: any) { flash(e.message); }
    setBusy(false);
  };

  const doLostLink = async () => {
    setBusy(true);
    try { await api.demoLostLink(); await refreshAll(); flash('Link dropped for a track'); }
    catch (e: any) { flash(e.message); }
    setBusy(false);
  };

  const doRouteViolator = async () => {
    setBusy(true);
    try { await api.demoRouteViolator(); await refreshAll(); flash('Unregistered drone routed into RED zone'); }
    catch (e: any) { flash(e.message); }
    setBusy(false);
  };

  const handleMapClick = async (lat: number, lon: number) => {
    if (!drawMode) return;
    const next = [...drawPoints, [lat, lon] as [number, number]];
    setDrawPoints(next);
    if (next.length === 4) {
      setBusy(true);
      try {
        await api.createZone({
          name: zoneName || 'TEMP RED ZONE',
          zone_type: 'RED',
          geometry: { type: 'Polygon', coordinates: [[...next.map(([la, lo]) => [lo, la]), next[0].slice().reverse() as any]] },
          min_altitude_m: zoneMinAlt,
          max_altitude_m: zoneMaxAlt,
          duration_s: zoneDuration,
        });
        flash(`Temporary RED zone created (${zoneDuration}s)`);
        setDrawPoints([]);
        setDrawMode(false);
        await refreshAll();
      } catch (e: any) { flash(e.message); setDrawPoints([]); setDrawMode(false); }
      setBusy(false);
    }
  };

  const submitDisposition = async () => {
    if (!dispoAlert) return;
    setBusy(true);
    try {
      await api.disposition(dispoAlert.alert_id, dispoAction, dispoReason);
      flash(`${dispoAction} recorded — reason: ${dispoReason}`);
      setDispoAlert(null);
      await refreshAll(); await refreshSlow();
    } catch (e: any) { flash(e.message); }
    setBusy(false);
  };

  const comp = health?.components || {};
  const uptime = health ? Math.floor(health.uptime_seconds) : 0;
  const rf = comp.rf_model || {};
  const systemOk = (s: string) => s === 'ONLINE';

  return (
    <div className="app">
      {/* ── TOP BAR (Phase 26) ── */}
      <header className="topbar">
        <div className="topbar-title">
          <span className="logo">◈</span>
          <div>
            <h1>SMART AIRSPACE SECURITY CONSOLE</h1>
            <span className="sub">
              PS3 — Civil Drone Activity Monitoring &amp; Coastal Surveillance
              · <b>TRACK A</b> · ALL DATA <b>SIMULATION</b>
            </span>
          </div>
        </div>
        <div className="topbar-status">
          {[
            ['FEED INGEST', comp.feed_ingest?.status],
            ['GEOFENCE', comp.geofence?.status],
            ['AUTHORIZATION', comp.authorization?.status],
            ['ALERT ENGINE', comp.alert_engine?.status],
            ['AUDIT', comp.audit?.status],
          ].map(([label, st]) => (
            <span key={label as string} className={`chip ${systemOk(st as string) ? 'chip-ok' : 'chip-down'}`}>
              {label} {systemOk(st as string) ? 'ONLINE' : 'OFFLINE'}
            </span>
          ))}
          <span className="chip chip-sim">UPTIME {uptime}s</span>
        </div>
      </header>

      {/* ── DEMO CONTROLS (Phases 2, 5, 28) ── */}
      <div className="controls">
        <button className="btn" onClick={doRandomize} disabled={busy}>⟳ RANDOMIZE AIRSPACE</button>
        <button className="btn btn-green" onClick={() => doSpawn('AUTHORIZED')} disabled={busy}>+ SPAWN AUTHORIZED</button>
        <button className="btn btn-orange" onClick={() => doSpawn('UNREGISTERED')} disabled={busy}>+ SPAWN UNREGISTERED</button>
        <button className="btn btn-red" onClick={() => doSpawn('VIOLATOR')} disabled={busy}>+ SPAWN VIOLATING TRACK</button>
        <button className="btn btn-purple" onClick={doLostLink} disabled={busy}>⌁ SIMULATE LOST LINK</button>
        <button className="btn btn-purple" onClick={doRouteViolator} disabled={busy}>➸ ROUTE VIOLATOR INTO ZONE</button>
        <button
          className={`btn ${drawMode ? 'btn-red active' : ''}`}
          onClick={() => { setDrawMode(!drawMode); setDrawPoints([]); }}
          disabled={busy}
        >▭ {drawMode ? 'CLICK 4 MAP POINTS…' : 'DRAW TEMPORARY RED ZONE'}</button>
        <button className="btn btn-dim" onClick={doClear} disabled={busy}>✕ CLEAR TRACKS</button>
        {drawMode && (
          <span className="draw-hint">
            NAME <input value={zoneName} onChange={(e) => setZoneName(e.target.value)} size={14} />
            DURATION(s) <input type="number" value={zoneDuration} min={5} max={86400}
              onChange={(e) => setZoneDuration(+e.target.value)} style={{ width: 70 }} />
            ALT(m) <input type="number" value={zoneMinAlt} onChange={(e) => setZoneMinAlt(+e.target.value)} style={{ width: 60 }} />
            – <input type="number" value={zoneMaxAlt} onChange={(e) => setZoneMaxAlt(+e.target.value)} style={{ width: 60 }} />
          </span>
        )}
      </div>

      {/* ── MAIN GRID ── */}
      <div className="main-grid">
        {/* LEFT: LIVE MAP (Phase 12) */}
        <div className="panel map-panel">
          <div className="panel-head">
            <span>LIVE MAP — JURISDICTION (SIMULATED TELEMETRY)</span>
            <span className="dim">{tracks.length} TRACKS · {zones.length} ZONES</span>
          </div>
          <MapContainer center={[13.07, 80.28]} zoom={12} className="map" preferCanvas>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickCapture onClick={handleMapClick} enabled={drawMode} />
            {/* Zones (Phases 4, 5, 12) */}
            {zones.map((z) => {
              const st = ZONE_STYLE[z.zone_type] || ZONE_STYLE.GREEN;
              const expired = z.expired;
              const ring = (z.geometry?.coordinates?.[0] || []).map((c: number[]) => [c[1], c[0]] as [number, number]);
              return (
                <Polygon key={z.zone_id} positions={ring} pathOptions={{
                  color: st.color, fillColor: st.fill, fillOpacity: 0.9,
                  dashArray: expired ? '8 8' : undefined, weight: expired ? 1.5 : 2.5,
                }}>
                  <Tooltip sticky>
                    <b>{z.name}</b> [{z.zone_type}]{expired ? ' — EXPIRED' : z.temporary ? ' — ACTIVE' : ''}<br />
                    Alt envelope {z.min_altitude_m}–{z.max_altitude_m} m<br />
                    {z.expires_at && !expired && <>Expires in {Math.max(0, Math.round(z.seconds_remaining ?? (z.expires_at - nowS)))}s<br /></>}
                    {expired && <>EXPIRED — no longer generating violations</>}
                  </Tooltip>
                </Polygon>
              );
            })}
            {/* Draw preview */}
            {drawPoints.length > 0 && (
              <Polygon positions={drawPoints} pathOptions={{ color: '#f85149', dashArray: '4 6', fillOpacity: 0.15 }} />
            )}
            {drawPoints.map((p, i) => (
              <CircleMarker key={i} center={p} radius={4} pathOptions={{ color: '#fff', fillColor: '#f85149', fillOpacity: 1 }} />
            ))}
            {/* Tracks (Phase 12/13) */}
            {tracks.map((t) => {
              const color = STATUS_COLOR[t.status] || '#888';
              const sel = t.track_id === selectedTrackId;
              return (
                <CircleMarker
                  key={t.track_id}
                  center={[t.latitude, t.longitude]}
                  radius={sel ? 10 : 7}
                  pathOptions={{
                    color: sel ? '#ffffff' : color, weight: sel ? 3 : 1.5,
                    fillColor: color, fillOpacity: t.status === 'LOST_LINK' ? 0.35 : 0.9,
                  }}
                  eventHandlers={{ click: () => setSelectedTrackId(t.track_id) }}
                >
                  <Tooltip direction="top" offset={[0, -6]}>
                    <b>{t.track_id}</b> · {t.remote_id}<br />
                    {STATUS_LABEL[t.status] || t.status} · AUTH: {t.authorization}<br />
                    ALT {t.altitude_m} m · SPD {t.velocity_mps} m/s
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </MapContainer>
          {/* Legend (Phase 13) */}
          <div className="legend">
            {Object.entries(STATUS_COLOR).map(([k, c]) => (
              <span key={k} className="legend-item">
                <span className="dot" style={{ background: c }} />
                {STATUS_LABEL[k]}{k === 'LOST_LINK' ? ' (hollow)' : ''}
              </span>
            ))}
            <span className="legend-item">▣ RED / ▣ YELLOW / ▣ GREEN = zones · dashed outline = expired</span>
          </div>
        </div>

        {/* RIGHT: ALERT QUEUE (Phases 8, 10, 11, 16, 17) */}
        <div className="panel alerts-panel">
          <div className="panel-head">
            <span>ACTIVE ALERTS</span>
            <span className="dim">OPEN: {openAlerts.filter((a) => a.status === 'OPEN').length} · TOTAL: {alerts.length}</span>
          </div>
          <div className="alert-list">
            {openAlerts.length === 0 && <div className="empty">No active alerts. All tracks compliant or informational.</div>}
            {openAlerts.map((a) => (
              <div key={a.alert_id}
                className={`alert-card prio-${a.priority.toLowerCase()} ${activeAlertId === a.alert_id ? 'selected' : ''}`}
                onClick={() => { setActiveAlertId(a.alert_id); setSelectedTrackId(a.track_id); }}>
                <div className="alert-row1">
                  <span className="prio-badge" style={{ background: PRIORITY_COLOR[a.priority] }}>{a.priority}</span>
                  <span className="alert-type">{a.type.replace('_', ' ')}</span>
                  <span className="alert-track" onClick={(e) => { e.stopPropagation(); setSelectedTrackId(a.track_id); }}>{a.track_id}</span>
                </div>
                <div className="alert-row2">
                  {a.timestamp_iso} · {a.zone_name ? `${a.zone_type} zone "${a.zone_name}"` : 'no zone'}
                </div>
                <div className="alert-row3">{a.reason}</div>
                <div className="alert-row4">
                  <span className="suggested">▸ {a.suggested_action}</span>
                  <span className="actions">
                    <button className="mini-btn" onClick={(e) => { e.stopPropagation(); setDispoAlert(a); setDispoAction('CONFIRM'); setDispoReason('VERIFIED VIOLATION'); }}>CONFIRM</button>
                    <button className="mini-btn" onClick={(e) => { e.stopPropagation(); setDispoAlert(a); setDispoAction('DISMISS'); setDispoReason('FALSE POSITIVE'); }}>DISMISS</button>
                    <button className="mini-btn" onClick={(e) => { e.stopPropagation(); setDispoAlert(a); setDispoAction('ESCALATE'); setDispoReason('VERIFIED VIOLATION'); }}>ESCALATE</button>
                  </span>
                </div>
                <div className="alert-row5 dim">DARK VESSEL: NOT APPLICABLE — TRACK A · status: {a.status}</div>
              </div>
            ))}
          </div>

          {/* Disposition modal (Phase 17) */}
          {dispoAlert && (
            <div className="modal-backdrop" onClick={() => setDispoAlert(null)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h3>{dispoAction} ALERT {dispoAlert.alert_id}</h3>
                <p className="dim">{dispoAlert.type} · {dispoAlert.track_id} · {dispoAlert.priority}</p>
                <label>Reason code (required):</label>
                <select value={dispoReason} onChange={(e) => setDispoReason(e.target.value)}>
                  {REASON_CODES.map((rc) => <option key={rc} value={rc}>{rc}</option>)}
                </select>
                <p className="dim small">Action will be attributed to DEMO-OPERATOR-01 (OPERATOR) and written to the append-only audit log.</p>
                <div className="modal-actions">
                  <button className="btn btn-primary" onClick={submitDisposition} disabled={busy}>SUBMIT</button>
                  <button className="btn btn-dim" onClick={() => setDispoAlert(null)}>CANCEL</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM ROW: track list · details · performance · audit ── */}
      <div className="bottom-grid">
        {/* TRACK LIST (Phase 14) */}
        <div className="panel">
          <div className="panel-head"><span>TRACK LIST</span><span className="dim">{tracks.length}</span></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr>
                <th>TRACK ID</th><th>REMOTE ID</th><th>STATUS</th><th>AUTH</th>
                <th>ALT m</th><th>m/s</th><th>LAST RPT</th><th>ALERT</th>
              </tr></thead>
              <tbody>
                {tracks.map((t) => (
                  <tr key={t.track_id}
                    className={t.track_id === selectedTrackId ? 'sel' : ''}
                    onClick={() => setSelectedTrackId(t.track_id)}>
                    <td className="mono">{t.track_id}</td>
                    <td className="mono">{t.remote_id}</td>
                    <td><span style={{ color: STATUS_COLOR[t.status], fontWeight: 700 }}>
                      {STATUS_LABEL[t.status] || t.status}</span></td>
                    <td>{t.authorization}</td>
                    <td>{t.altitude_m}</td>
                    <td>{t.velocity_mps}</td>
                    <td>{t.time_since_last_report_s != null ? `${t.time_since_last_report_s}s` : '—'}</td>
                    <td>{t.last_alert_id ? <span className="mono alert-link">{t.last_alert_id}</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TARGET DETAILS (Phase 15) */}
        <div className="panel">
          <div className="panel-head"><span>TARGET DETAILS</span></div>
          {selected ? (
            <div className="details">
              <div className="d-row"><span>Track ID</span><b className="mono">{selected.track_id}</b></div>
              <div className="d-row"><span>Remote ID</span><b className="mono">{selected.remote_id}</b></div>
              <div className="d-row"><span>Authorization</span>
                <b style={{ color: selected.authorization === 'AUTHORIZED' ? '#2ea043' : '#f0883e' }}>{selected.authorization}</b></div>
              <div className="d-row"><span>Status</span>
                <b style={{ color: STATUS_COLOR[selected.status] }}>{STATUS_LABEL[selected.status] || selected.status}</b></div>
              <div className="d-row"><span>Latitude</span><b>{selected.latitude}</b></div>
              <div className="d-row"><span>Longitude</span><b>{selected.longitude}</b></div>
              <div className="d-row"><span>Altitude</span><b>{selected.altitude_m} m</b></div>
              <div className="d-row"><span>Velocity</span><b>{selected.velocity_mps} m/s</b></div>
              <div className="d-row"><span>Heading</span><b>{selected.heading_deg}°</b></div>
              <div className="d-row"><span>Last Seen</span><b>{selected.time_since_last_report_s ?? '—'}s ago</b></div>
              <div className="d-row"><span>Track Confidence</span><b>{(selected.track_confidence * 100).toFixed(1)}%</b></div>
              <div className="d-row"><span>Current Zone</span><b>{selected.zone_name ? `${selected.zone_type} — ${selected.zone_name}` : 'NONE'}</b></div>
              <div className={`violation-box ${selected.violation ? 'violating' : ''}`}>
                Violation: <b>{selected.violation ? 'YES' : 'NO'}</b><br />
                {selected.violation && <>Zone: <b>{selected.zone_type} — {selected.zone_name}</b><br /></>}
                {selected.violation && <>Reason: {selected.violation_reason}</>}
              </div>
            </div>
          ) : <div className="empty">Click a track on the map or in the list.</div>}
        </div>

        {/* MODEL PERFORMANCE + LATENCY (Phases 29, 30) */}
        <div className="panel">
          <div className="panel-head"><span>MODEL PERFORMANCE &amp; SYSTEM LATENCY</span></div>
          <div className="details">
            <div className="section-label">RF CLASSIFIER (REAL MODEL — FALLBACK EVIDENCE)</div>
            {rf.model ? (
              <>
                <div className="d-row"><span>Model</span><b>{String(rf.model).toUpperCase()}</b></div>
                <div className="d-row"><span>Threshold</span><b>{rf.threshold ?? '—'}</b></div>
                <div className="d-row"><span>Accuracy</span><b>99.52%</b></div>
                <div className="d-row"><span>Precision</span><b>99.05%</b></div>
                <div className="d-row"><span>Recall</span><b>99.05%</b></div>
                <div className="d-row"><span>F1</span><b>99.05%</b></div>
                <div className="d-row"><span>ROC-AUC</span><b>1.0000</b></div>
              </>
            ) : <div className="empty">RF model: N/A</div>}
            <div className="section-label">VISION</div>
            <div className="d-row"><span>Status</span><b>SIMULATION (local Faster R-CNN available; no live camera)</b></div>
            <div className="d-row"><span>Precision</span><b>N/A</b></div>
            <div className="d-row"><span>Recall</span><b>N/A</b></div>
            <div className="section-label">SYSTEM LATENCY (MEASURED)</div>
            <div className="d-row"><span>Last telemetry age</span><b>{metrics?.last_telemetry_age_s != null ? `${metrics.last_telemetry_age_s}s` : '—'}</b></div>
            <div className="d-row"><span>Ingest latency</span><b>{metrics?.ingest_latency_ms != null ? `${metrics.ingest_latency_ms} ms` : '—'}</b></div>
            <div className="d-row"><span>Processing latency</span><b>{metrics?.processing_latency_ms != null ? `${metrics.processing_latency_ms} ms` : '—'}</b></div>
            <div className="d-row"><span>Alert latency</span><b>{metrics?.alert_latency_ms != null ? `${metrics.alert_latency_ms} ms` : '—'}</b></div>
            <div className="d-row"><span>Reports ingested</span><b>{metrics?.reports_ingested ?? '—'}</b></div>
            <div className="d-row dim small">Targets: ≤2 s report→console, ≤5 s violation→alert</div>
          </div>
        </div>

        {/* AUDIT LOG (Phases 19-21) */}
        <div className="panel">
          <div className="panel-head">
            <span>AUDIT LOG (APPEND-ONLY)</span>
            <span className="export-btns">
              <a className="btn btn-sm" href={api.auditExportUrl('csv')} target="_blank" rel="noreferrer">⬇ EXPORT CSV</a>
              <a className="btn btn-sm" href={api.auditExportUrl('json')} target="_blank" rel="noreferrer">⬇ JSON</a>
            </span>
          </div>
          <div className="table-wrap audit-list">
            <table className="tbl">
              <thead><tr>
                <th>EVENT</th><th>TIME</th><th>OPERATOR</th><th>ACTION</th>
                <th>ALERT</th><th>TRACK</th><th>REASON</th><th>STATUS</th>
              </tr></thead>
              <tbody>
                {audit.slice(0, 40).map((r) => (
                  <tr key={r.event_id}>
                    <td className="mono">{r.event_id}</td>
                    <td className="mono small">{new Date(r.timestamp * 1000).toLocaleTimeString()}</td>
                    <td>{r.operator_id}<span className="dim small"> ({r.operator_role})</span></td>
                    <td>{r.action}</td>
                    <td className="mono small">{r.alert_id || '—'}</td>
                    <td className="mono small">{r.track_id || '—'}</td>
                    <td className="small">{r.reason_code || '—'}</td>
                    <td className="small">{r.previous_status}→{r.new_status}</td>
                  </tr>
                ))}
                {audit.length === 0 && <tr><td colSpan={8} className="empty">No audit records yet.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="dim small" style={{ padding: '4px 10px' }}>
            Retention: {authRegistry ? '' : ''}configured server-side (7/30/90 days). Records are hash-chained and cannot be edited or deleted via the UI or API.
          </div>
        </div>
      </div>

      {/* AUTHORIZATION REGISTRY strip (Phase 7) */}
      <div className="registry-strip">
        <span className="section-label">AUTHORIZATION REGISTRY</span>
        {authRegistry?.entries?.length
          ? authRegistry.entries.map((e: any) => (
            <span key={e.remote_id} className={`chip ${e.status === 'AUTHORIZED' ? 'chip-ok' : 'chip-warn'}`}>
              {e.remote_id} = {e.status}
            </span>
          ))
          : <span className="dim">no registered IDs — unknown IDs are UNREGISTERED</span>}
        <span className="chip chip-sim">Policy: unknown remote ID ⇒ UNREGISTERED</span>
      </div>

      <footer className="footer">
        <span>PS3 — Smart Governance &amp; Security · Operator-console prototype · ALL telemetry SIMULATED (SIMULATED_REMOTE_ID) · No interdiction/jamming/spoofing functionality exists</span>
        <span>API: <a href={`${API_BASE}/docs`} target="_blank" rel="noreferrer">/docs</a></span>
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
