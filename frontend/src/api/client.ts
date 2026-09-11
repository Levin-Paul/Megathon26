const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  health: () => fetchJSON<any>('/api/health'),

  // ── PS3 console ──
  tracks: () => fetchJSON<any>('/api/tracks'),
  zones: () => fetchJSON<any>('/api/zones'),
  alerts: (status?: string) =>
    fetchJSON<any>(`/api/alerts${status ? `?status=${status}` : ''}`),
  metrics: () => fetchJSON<any>('/api/metrics'),
  audit: (limit = 100) => fetchJSON<any>(`/api/audit?limit=${limit}`),
  authorization: () => fetchJSON<any>('/api/authorization'),
  demoConstants: () => fetchJSON<any>('/api/demo/constants'),

  createZone: (zone: {
    name: string;
    zone_type: string;
    geometry: { type: string; coordinates: number[][][] };
    min_altitude_m: number;
    max_altitude_m: number;
    duration_s?: number;
  }) =>
    fetchJSON<any>('/api/zones', { method: 'POST', body: JSON.stringify(zone) }),

  deleteZone: (zoneId: string) =>
    fetchJSON<any>(`/api/zones/${zoneId}`, { method: 'DELETE' }),

  disposition: (alertId: string, action: string, reasonCode: string) =>
    fetchJSON<any>(`/api/alerts/${alertId}/disposition`, {
      method: 'POST',
      body: JSON.stringify({ action, reason_code: reasonCode }),
    }),

  demoRandomize: () =>
    fetchJSON<any>('/api/demo/randomize', { method: 'POST' }),

  demoSpawn: (kind: 'AUTHORIZED' | 'UNREGISTERED' | 'VIOLATOR') =>
    fetchJSON<any>('/api/demo/spawn', {
      method: 'POST',
      body: JSON.stringify({ kind }),
    }),

  demoRouteViolator: () =>
    fetchJSON<any>('/api/demo/route-violator', { method: 'POST' }),

  demoLostLink: () => fetchJSON<any>('/api/demo/lost-link', { method: 'POST' }),

  demoRestoreLinks: () =>
    fetchJSON<any>('/api/demo/restore-links', { method: 'POST' }),

  demoClear: () => fetchJSON<any>('/api/demo/clear', { method: 'POST' }),

  auditExportUrl: (fmt: 'csv' | 'json') =>
    `${API_BASE}/api/audit/export?fmt=${fmt}`,

  // ── Legacy multi-modal panels ──
  rfSamples: (count = 8) => fetchJSON<any[]>(`/api/rf/samples?count=${count}`),
  rfPredict: (samples: number[]) =>
    fetchJSON<any>('/api/rf/predict', {
      method: 'POST',
      body: JSON.stringify({ samples }),
    }),
  fusionPredict: (data: { radar?: any; vision?: any; rf?: any }) =>
    fetchJSON<any>('/api/fusion/predict', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export { API_BASE };
