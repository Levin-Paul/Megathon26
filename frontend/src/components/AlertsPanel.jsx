import React, { useState } from 'react';
import { Bell, Check, X, FolderPlus, Clock, AlertTriangle, ShieldCheck, ArrowUpRight } from 'lucide-react';

const ALLOWED_REASONS = {
  CONFIRMED: [
    { code: 'RULE_BREACH_CONFIRMED', label: 'Rule Breach Confirmed (Official Incursion)' },
    { code: 'VERIFIED_VIOLATION', label: 'Verified Geofence / Altitude Violation' },
    { code: 'ACTIVE_INTRUSION', label: 'Active Defense Airspace Intrusion' },
    { code: 'RESTRICTED_AIRSPACE_BREACH', label: 'Restricted Naval / Harbor Airspace Breach' }
  ],
  DISMISSED: [
    { code: 'AUTHORIZED_AFTER_REVIEW', label: 'Authorized After Operational Review' },
    { code: 'FALSE_POSITIVE', label: 'False Positive Sensor Glitch' },
    { code: 'DUPLICATE_ALERT', label: 'Duplicate Multi-Sensor Alert' },
    { code: 'SENSOR_ERROR', label: 'Sensor Calibration Discrepancy' },
    { code: 'NATURAL_WILDLIFE_CONFIRMED', label: 'Natural Marine Wildlife (Bird Flock)' }
  ],
  ESCALATED: [
    { code: 'SAFETY_RISK', label: 'Imminent Maritime / Harbor Safety Risk' },
    { code: 'CRITICAL_ZONE_BREACH', label: 'Critical Naval Defense Perimeter Penetration' },
    { code: 'REQUIRES_COMMAND_REVIEW', label: 'Requires Senior Duty Officer Command Review' },
    { code: 'GROUND_PATROL_DISPATCHED', label: 'Ground Law Enforcement Patrol Dispatched' }
  ]
};

export default function AlertsPanel({ alerts, liveEvents, onAlertAction, onRefreshAlerts }) {
  // Disposition modal state
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [dispositionType, setDispositionType] = useState('CONFIRMED'); // CONFIRMED, DISMISSED, ESCALATED
  const [reasonCode, setReasonCode] = useState('RULE_BREACH_CONFIRMED');
  const [dispNotes, setDispNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getSeverityStyle = (sev, alertType) => {
    if (alertType === 'LOST_LINK') {
      return 'border-purple-500/40 bg-purple-500/10 text-slate-200';
    }
    switch (sev) {
      case 'CRITICAL':
        return 'border-red-500/40 bg-red-500/10 text-slate-200';
      case 'HIGH':
        return 'border-amber-500/40 bg-amber-500/10 text-slate-200';
      case 'MEDIUM':
        return 'border-amber-500/20 bg-amber-500/5 text-slate-200';
      default:
        return 'border-blue-500/30 bg-blue-500/10 text-slate-200';
    }
  };

  const getTaxonomyBadge = (alertType) => {
    switch (alertType) {
      case 'OUT_OF_ENVELOPE':
        return <span className="bg-red-500/20 text-red-300 font-bold px-2 py-0.5 rounded border border-red-500/40 text-[10px]">OUT_OF_ENVELOPE</span>;
      case 'UNREGISTERED':
        return <span className="bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/40 text-[10px]">UNREGISTERED</span>;
      case 'LOST_LINK':
        return <span className="bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded border border-purple-500/40 text-[10px]">LOST_LINK</span>;
      default:
        return <span className="bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/40 text-[10px]">AUTHORIZED</span>;
    }
  };

  const openDispositionModal = (alt, type) => {
    setSelectedAlert(alt);
    setDispositionType(type);
    setReasonCode(ALLOWED_REASONS[type][0].code);
    setDispNotes('');
  };

  const handleDispositionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAlert || !reasonCode) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('aeroguard_token') || 'aerosec-officer-token';
      const res = await fetch(`/api/alerts/${selectedAlert.alert_id}/disposition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          disposition: dispositionType,
          reason_code: reasonCode,
          notes: dispNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedAlert(null);
        if (onRefreshAlerts) onRefreshAlerts();
      } else {
        alert(`Error recording disposition: ${data.error}`);
      }
    } catch (err) {
      console.error('Disposition error:', err);
      alert('Network error submitting disposition.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeAlerts = alerts?.filter((a) => a.status === 'ACTIVE') || [];

  return (
    <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-3.5 text-xs flex flex-col space-y-3 select-none h-full overflow-hidden shadow-sm font-sans">
      {/* Alerts Header */}
      <div className="flex items-center justify-between border-b border-aerodark-700 pb-2.5 shrink-0">
        <div className="flex items-center space-x-2">
          <Bell className={`w-4 h-4 ${activeAlerts.length > 0 ? 'text-red-400 animate-bounce' : 'text-slate-400'}`} />
          <span className="font-semibold text-slate-100 uppercase tracking-wide text-xs">
            Track-A Real-Time Threat Alerts
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded border border-aerodark-700">
            DARK_VESSEL: N/A (Track B Only)
          </span>
          <span className="bg-red-500/15 text-red-300 text-[11px] px-2.5 py-0.5 rounded-full font-semibold border border-red-500/30">
            {activeAlerts.length} ACTIVE
          </span>
        </div>
      </div>

      {/* Active Alerts List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {alerts && alerts.length > 0 ? (
          alerts.map((alt) => (
            <div
              key={alt.alert_id}
              className={`p-3 rounded-lg border ${getSeverityStyle(alt.severity, alt.alert_type)} transition-all shadow-sm`}
            >
              <div className="flex items-center justify-between font-mono text-[10px] mb-1.5 text-slate-400">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-200">{alt.alert_id}</span>
                  {getTaxonomyBadge(alt.alert_type)}
                </div>
                <span>{alt.created_at?.substring(11, 19) || 'LIVE'}</span>
              </div>

              <div className="font-bold text-slate-100 text-xs mb-1 flex items-center justify-between">
                <span>{alt.title}</span>
                {alt.subtype && (
                  <span className="text-[10px] text-slate-400 font-mono font-normal">
                    [{alt.subtype}]
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-300 mb-2 leading-relaxed">{alt.reason}</div>

              {/* Advisory Suggested Action Band */}
              {(alt.suggested_action || alt.recommended_action) && (
                <div className="bg-aerodark-900 p-2 rounded-md border border-aerodark-700 font-sans text-[11px] text-slate-200 mb-2.5 flex items-start space-x-1.5">
                  <strong className="text-blue-400 font-semibold shrink-0 uppercase tracking-wider">SUGGESTED ACTION:</strong>
                  <span className="text-slate-100 font-medium">{alt.suggested_action || alt.recommended_action}</span>
                </div>
              )}

              {/* Disposition Status or Mandatory Disposition Action Buttons */}
              {alt.status === 'RESOLVED' || alt.status === 'DISMISSED' || alt.disposition ? (
                <div className="pt-1.5 border-t border-aerodark-700/60 font-sans text-[11px] flex items-center justify-between text-slate-400">
                  <span className="flex items-center space-x-1 text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>DISPOSITION: {alt.disposition} ({alt.disposition_reason})</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">by {alt.disposition_by || 'Officer'}</span>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-2 border-t border-aerodark-700/60 font-sans text-xs">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">RECORD DISPOSITION:</span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => openDispositionModal(alt, 'CONFIRMED')}
                      className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer flex items-center space-x-1"
                    >
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>CONFIRM</span>
                    </button>
                    <button
                      onClick={() => openDispositionModal(alt, 'ESCALATE')}
                      className="bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 px-2.5 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer flex items-center space-x-1"
                    >
                      <ArrowUpRight className="w-3 h-3 text-red-400" />
                      <span>ESCALATE</span>
                    </button>
                    <button
                      onClick={() => openDispositionModal(alt, 'DISMISSED')}
                      className="bg-aerodark-800 hover:bg-aerodark-750 text-slate-400 hover:text-slate-200 border border-aerodark-700 px-2 py-1 rounded-md text-xs transition-colors cursor-pointer flex items-center space-x-1"
                    >
                      <X className="w-3 h-3" />
                      <span>DISMISS</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-slate-500 font-sans text-xs">
            No active threat alerts in sector.
          </div>
        )}
      </div>

      {/* Mandatory Reason-Code Disposition Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4 font-sans text-xs">
            <div className="flex items-center justify-between border-b border-aerodark-700 pb-2.5">
              <div className="font-bold text-sm text-slate-100 flex items-center space-x-2">
                <AlertTriangle className={`w-4 h-4 ${dispositionType === 'CONFIRMED' ? 'text-emerald-400' : (dispositionType === 'ESCALATED' ? 'text-red-400' : 'text-slate-400')}`} />
                <span>OFFICER DISPOSITION: {dispositionType}</span>
              </div>
              <button onClick={() => setSelectedAlert(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-aerodark-900 p-2.5 rounded border border-aerodark-700 space-y-1">
              <div className="font-semibold text-slate-200">{selectedAlert.title}</div>
              <div className="text-[11px] text-slate-400 font-mono">Track: {selectedAlert.track_id} | Alert: {selectedAlert.alert_id}</div>
              <div className="text-[11px] text-slate-300">{selectedAlert.reason}</div>
            </div>

            <form onSubmit={handleDispositionSubmit} className="space-y-3.5">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Mandatory Reason Code <span className="text-red-400">*</span>
                </label>
                <select
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                  className="w-full bg-aerodark-900 border border-aerodark-700 rounded px-3 py-2 text-slate-100 outline-none focus:border-blue-500 font-sans cursor-pointer text-xs"
                  required
                >
                  {(ALLOWED_REASONS[dispositionType] || ALLOWED_REASONS.CONFIRMED).map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.code} — {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Operational Notes / Action Details</label>
                <textarea
                  rows={2}
                  value={dispNotes}
                  onChange={(e) => setDispNotes(e.target.value)}
                  placeholder="Enter details, patrol dispatch units, or findings..."
                  className="w-full bg-aerodark-900 border border-aerodark-700 rounded p-2 text-slate-100 outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div className="p-2 rounded bg-aerodark-900 text-slate-400 text-[10px] leading-relaxed border border-aerodark-700/60">
                <span className="text-blue-400 font-semibold">AUDIT COMMIT:</span> This disposition and reason code will be permanently signed and hashed into the tamper-evident SHA-256 audit ledger.
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-aerodark-700">
                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  className="px-3 py-1.5 rounded-lg border border-aerodark-700 text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold px-4 py-1.5 rounded-lg shadow-md cursor-pointer flex items-center space-x-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'SIGNING...' : 'COMMIT DISPOSITION'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Operational Event Stream Timeline */}
      <div className="border-t border-aerodark-700 pt-2.5 shrink-0 max-h-36 overflow-y-auto">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>LIVE EVENT STREAM TIMELINE</span>
        </div>
        <div className="space-y-1 font-mono text-[10px]">
          {liveEvents?.map((evt, idx) => (
            <div key={idx} className="flex items-start space-x-2 text-slate-400">
              <span className="text-blue-400 font-semibold shrink-0">{evt.timestamp}</span>
              <span className="text-slate-300 font-sans text-[11px]">{evt.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
