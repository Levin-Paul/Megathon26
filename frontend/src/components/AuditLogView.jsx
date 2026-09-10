import React, { useState } from 'react';
import { ScrollText, ShieldCheck, ShieldAlert, Download, RefreshCw, CheckCircle2, FileText, Hash } from 'lucide-react';

export default function AuditLogView({ logs, onRefresh }) {
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/audit/verify');
      const data = await res.json();
      if (data.success) {
        setVerificationResult(data.verification);
      }
    } catch (err) {
      console.error('Audit verification error:', err);
      setVerificationResult({ valid: false, status: 'VERIFICATION ERROR', error: 'Network communication error.' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExport = (format) => {
    window.open(`/api/audit/export?format=${format}`, '_blank');
  };

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto text-xs font-sans select-none overflow-y-auto h-full">
      {/* Header */}
      <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-lg bg-aerodark-900 border border-aerodark-700">
            <ScrollText className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="font-semibold text-sm text-slate-100 tracking-wide flex items-center space-x-2">
              <span>TAMPER-EVIDENT FORENSIC AUDIT LEDGER</span>
              <span className="bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] px-2 py-0.5 rounded font-mono font-medium">
                SHA-256 HASH CHAIN
              </span>
            </div>
            <div className="text-slate-400 text-xs mt-0.5">
              Cryptographically chained ledger of all radar telemetry ingestions, AI classifications, operator dispositions, and geofence updates.
            </div>
          </div>
        </div>

        {/* Audit Actions Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* VERIFY AUDIT CHAIN BUTTON */}
          <button
            onClick={handleVerifyChain}
            disabled={isVerifying}
            className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-all shadow-sm flex items-center space-x-1.5 border cursor-pointer ${
              verificationResult?.valid
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400/40'
            }`}
          >
            {isVerifying ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : verificationResult?.valid ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
            <span>
              {isVerifying
                ? 'VERIFYING...'
                : verificationResult
                ? `${verificationResult.status} (${verificationResult.records_verified} records)`
                : 'VERIFY AUDIT CHAIN'}
            </span>
          </button>

          {/* EXPORT CSV BUTTON */}
          <button
            onClick={() => handleExport('csv')}
            title="Download full audit ledger as comma-separated values (.csv)"
            className="bg-aerodark-900 hover:bg-aerodark-800 text-slate-200 border border-aerodark-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>EXPORT CSV</span>
          </button>

          {/* EXPORT JSON BUTTON */}
          <button
            onClick={() => handleExport('json')}
            title="Download full audit ledger as JSON format (.json)"
            className="bg-aerodark-900 hover:bg-aerodark-800 text-slate-200 border border-aerodark-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>EXPORT JSON</span>
          </button>

          <div className="bg-aerodark-900 text-slate-300 font-mono text-xs px-3 py-1.5 rounded-lg border border-aerodark-700">
            TOTAL: {logs?.length || 0}
          </div>
        </div>
      </div>

      {/* Verification Status Banner (if checked) */}
      {verificationResult && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-sans shadow-sm ${
            verificationResult.valid
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-red-500/15 border-red-500/40 text-red-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {verificationResult.valid ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <div>
              <strong className="font-semibold">{verificationResult.status}:</strong> {verificationResult.message || verificationResult.error}
            </div>
          </div>
          {verificationResult.latest_hash && (
            <div className="font-mono text-[10px] text-slate-400 hidden md:block">
              LATEST HASH: <span className="text-slate-200">{verificationResult.latest_hash.substring(0, 16)}...</span>
            </div>
          )}
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="text-slate-400 border-b border-aerodark-700 bg-aerodark-900 font-sans">
              <tr>
                <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Timestamp</th>
                <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Operator</th>
                <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Action Event</th>
                <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Reason Code</th>
                <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Resource</th>
                <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">SHA-256 Hash</th>
                <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Operational Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-aerodark-700/40 text-slate-300">
              {logs && logs.length > 0 ? (
                logs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-aerodark-800/50 transition-colors">
                    <td className="px-3.5 py-2 text-blue-400 font-bold whitespace-nowrap">
                      {log.timestamp?.substring(11, 19) || log.timestamp}
                    </td>
                    <td className="px-3.5 py-2 font-semibold text-slate-200 font-sans">
                      <div>{log.operator_id || log.user_name}</div>
                      {log.operator_role && (
                        <span className="text-[10px] text-slate-400 font-normal">[{log.operator_role}]</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2">
                      <span className="bg-aerodark-900 text-slate-300 px-2 py-0.5 rounded-md border border-aerodark-700 font-sans text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3.5 py-2 font-mono text-[11px] text-amber-300">
                      {log.reason_code || '—'}
                    </td>
                    <td className="px-3.5 py-2 text-slate-400 font-sans text-[11px]">
                      {log.resource_id || log.resource}
                    </td>
                    <td className="px-3.5 py-2 text-slate-400 font-mono text-[10px]" title={log.current_hash}>
                      {log.current_hash ? (
                        <span className="text-emerald-400/90 font-mono">
                          {log.current_hash.substring(0, 10)}...
                        </span>
                      ) : (
                        <span className="text-slate-600">UNHASHED</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2 text-slate-400 max-w-md truncate font-sans text-[11px]">
                      {log.details}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-slate-500 font-sans">
                    No audit records retrieved.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
