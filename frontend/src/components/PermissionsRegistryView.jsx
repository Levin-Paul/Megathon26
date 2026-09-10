import React from 'react';
import { Plane, CheckCircle2, XCircle, FileCheck2, User, Clock, Shield } from 'lucide-react';

export default function PermissionsRegistryView({
  drones,
  permissions,
  onApprovePermission,
  onRejectPermission
}) {
  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto text-xs font-sans select-none overflow-y-auto h-full">
      {/* Header */}
      <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-lg bg-aerodark-900 border border-aerodark-700">
            <FileCheck2 className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="font-semibold text-sm text-slate-100 tracking-wide">
              DGCA & CIVIL AIRSPACE AUTHORIZATION DESK
            </div>
            <div className="text-slate-400 text-xs mt-0.5">
              Review and adjudicate drone flight permissions, altitude waivers, and verify UIN registrations
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 font-sans text-xs">
          <span className="bg-amber-500/15 text-amber-300 px-3 py-1 rounded-md border border-amber-500/30 font-medium">
            {permissions?.filter((p) => p.status === 'PENDING').length || 0} PENDING REVIEWS
          </span>
        </div>
      </div>

      {/* Flight Permissions Adjudication Table */}
      <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-5 space-y-3.5 shadow-sm">
        <div className="font-semibold text-slate-200 text-xs uppercase tracking-wider">
          Incoming Civilian Flight Permission Requests
        </div>

        <div className="overflow-x-auto rounded-lg border border-aerodark-700/60">
          <table className="w-full text-left font-mono text-xs">
            <thead className="text-slate-400 border-b border-aerodark-700 bg-aerodark-900 font-sans">
              <tr>
                <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Permit ID</th>
                <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Drone UIN</th>
                <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Operator</th>
                <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Flight Purpose</th>
                <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Zone</th>
                <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Max Alt</th>
                <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Status</th>
                <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase text-right">Officer Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-aerodark-700/40 text-slate-300">
              {permissions?.map((p) => (
                <tr key={p.permission_id} className="hover:bg-aerodark-800/50 transition-colors">
                  <td className="px-3.5 py-2.5 font-bold text-blue-400">{p.permission_id}</td>
                  <td className="px-3.5 py-2.5 font-semibold text-slate-200">{p.uin_number || p.drone_id}</td>
                  <td className="px-3.5 py-2.5 font-sans">{p.operator_name}</td>
                  <td className="px-3.5 py-2.5 font-sans">{p.flight_purpose}</td>
                  <td className="px-3.5 py-2.5 text-slate-400 font-sans">{p.allowed_zone}</td>
                  <td className="px-3.5 py-2.5">{p.max_altitude_m}m AGL</td>
                  <td className="px-3.5 py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-md font-sans font-medium text-[10px] ${
                        p.status === 'APPROVED'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : p.status === 'PENDING'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'bg-red-500/15 text-red-300 border border-red-500/30'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    {p.status === 'PENDING' ? (
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => onApprovePermission && onApprovePermission(p.permission_id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-md font-sans text-xs font-medium transition-all shadow-sm"
                        >
                          APPROVE
                        </button>
                        <button
                          onClick={() => onRejectPermission && onRejectPermission(p.permission_id)}
                          className="bg-red-600 hover:bg-red-500 text-white px-2.5 py-1 rounded-md font-sans text-xs font-medium transition-all shadow-sm"
                        >
                          REJECT
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs font-sans">Adjudicated</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drone Hardware Registry */}
      <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-5 space-y-3.5 shadow-sm">
        <div className="font-semibold text-slate-200 text-xs uppercase tracking-wider flex items-center space-x-2">
          <Plane className="w-4 h-4 text-blue-400" />
          <span>Active Drone Hardware Registry</span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-aerodark-700/60">
          <table className="w-full text-left font-mono text-xs">
            <thead className="text-slate-400 border-b border-aerodark-700 bg-aerodark-900 font-sans">
              <tr>
                <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Drone ID</th>
                <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">DGCA UIN</th>
                <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Model Name</th>
                <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Type</th>
                <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Weight Class</th>
                <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Owner / Operator</th>
                <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-aerodark-700/40 text-slate-300">
              {drones?.map((d) => (
                <tr key={d.drone_id} className="hover:bg-aerodark-800/50 transition-colors">
                  <td className="px-3.5 py-2.5 font-bold text-blue-400">{d.drone_id}</td>
                  <td className="px-3.5 py-2.5 font-semibold text-slate-200">{d.uin_number}</td>
                  <td className="px-3.5 py-2.5 font-sans">{d.model_name}</td>
                  <td className="px-3.5 py-2.5 font-sans">{d.drone_type}</td>
                  <td className="px-3.5 py-2.5 font-sans">{d.weight_category}</td>
                  <td className="px-3.5 py-2.5 font-sans">{d.owner_name}</td>
                  <td className="px-3.5 py-2.5">
                    <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-md font-sans font-medium text-[10px]">
                      {d.registration_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
