// lib/api.ts — Frontend API client for GAS backend

const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL!;
const GAS_SECRET = process.env.NEXT_PUBLIC_GAS_SECRET!;
const GET_CACHE_TTL = 30000; // 30s — GAS responses are slow, cache longer
const getCache = new Map<string, { expiresAt: number; value: unknown }>();
const pendingGets = new Map<string, Promise<any>>();

function buildCacheKey(action: string, params: Record<string, string>) {
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b));
  return `${action}:${JSON.stringify(pairs)}`;
}

function clearGetCache() {
  getCache.clear();
  pendingGets.clear();
}

// Invalidate only cache entries that are affected by a write to a specific patient/incident
// Preserves unrelated cached data (e.g. init_data, dashboard) so navigating back is instant
function invalidatePatientCache(patient_id?: string) {
  if (!patient_id) { clearGetCache(); return; }
  const keysToDelete: string[] = [];
  getCache.forEach((_, key) => {
    if (key.startsWith('get_patients:') || key.startsWith('dashboard:')) {
      keysToDelete.push(key);
    } else if (key.includes(`"patient_id","${patient_id}"`)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(k => getCache.delete(k));
  keysToDelete.forEach(k => pendingGets.delete(k));
}

async function gasGet(action: string, params: Record<string, string> = {}) {
  const cacheKey = buildCacheKey(action, params);
  const cached = getCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const pending = pendingGets.get(cacheKey);
  if (pending) return pending;

  const request = (async () => {
    try {
      const url = new URL(GAS_URL);
      url.searchParams.set('action', action);
      url.searchParams.set('secret', GAS_SECRET);
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
      });
      const res = await fetch(url.toString(), { redirect: 'follow' });
      const text = await res.text();
      let payload;
      try { payload = JSON.parse(text); }
      catch { payload = { status: 'error', message: 'Invalid response: ' + text.slice(0, 100) }; }
      if (payload?.status === 'ok') {
        getCache.set(cacheKey, { expiresAt: Date.now() + GET_CACHE_TTL, value: payload });
      }
      return payload;
    } catch (err: any) {
      return { status: 'error', message: err?.message || 'Network error' };
    } finally {
      pendingGets.delete(cacheKey);
    }
  })();

  pendingGets.set(cacheKey, request);
  return request;
}

async function gasPost(action: string, body: Record<string, unknown>) {
  try {
    const url = new URL(GAS_URL);
    url.searchParams.set('secret', GAS_SECRET);
    // No Content-Type header — avoids CORS preflight with Google Apps Script
    const res = await fetch(url.toString(), {
      method: 'POST',
      redirect: 'follow',
      body: JSON.stringify({ action, ...body }),
    });
    const text = await res.text();
    let payload;
    try { payload = JSON.parse(text); }
    catch { payload = { status: 'error', message: 'Invalid response: ' + text.slice(0, 100) }; }
    if (payload?.status === 'ok') {
      // Smart invalidation: only clear caches affected by this write
      const pid = (body.patient_id || body.patient_id) as string | undefined;
      invalidatePatientCache(pid);
    }
    return payload;
  } catch (err: any) {
    return { status: 'error', message: err?.message || 'Network error' };
  }
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    gasPost('login', { username, password }),

  // Dashboard
  getDashboard: (year?: string) =>
    gasGet('dashboard', year ? { year } : {}),

  // Patients
  getPatients: (params?: { search?: string; status?: string; category?: string }) =>
    gasGet('get_patients', (params || {}) as Record<string, string>),
  getPatient: (patient_id: string, bustCache = false) => {
    if (bustCache) {
      // Remove any cached entry for this patient before fetching
      const key = buildCacheKey('get_patient', { patient_id });
      getCache.delete(key);
    }
    return gasGet('get_patient', { patient_id });
  },
  createPatient: (data: Record<string, unknown>) =>
    gasPost('create_patient', data),
  updatePatient: (data: Record<string, unknown>) =>
    gasPost('update_patient', data),

  // Incidents
  createIncident: (data: Record<string, unknown>) =>
    gasPost('create_incident', data),
  updateIncident: (data: Record<string, unknown>) =>
    gasPost('update_incident', data),

  // Doses
  getDoses: (params?: { patient_id?: string; incident_id?: string; status?: string }) =>
    gasGet('get_doses', (params || {}) as Record<string, string>),
  administerDose: (data: Record<string, unknown>) =>
    gasPost('administer_dose', data),
  deleteDose: (data: Record<string, unknown>) =>
    gasPost('delete_dose', data),

  // Init data (accounts + nurses in one call for performance)
  getInitData: () => gasGet('init_data'),
  // Accounts
  getAccounts: () => gasGet('get_accounts'),
  getNurses: () => gasGet('get_nurses'),
  createAccount: (data: Record<string, unknown>) =>
    gasPost('create_account', data),
  updateAccount: (data: Record<string, unknown>) =>
    gasPost('update_account', data),

  // Pet monitor
  updatePetMonitor: (data: Record<string, unknown>) =>
    gasPost('update_pet_monitor', data),

  // Dose scheduling
  updateDoseDate: (data: Record<string, unknown>) =>
    gasPost('update_dose_date', data),

  // Delete (admin only)
  deletePatient: (patient_id: string) =>
    gasPost('delete_patient', { patient_id }),
  deleteIncident: (incident_id: string) =>
    gasPost('delete_incident', { incident_id }),

  // Export
  exportCSV: (params?: { status?: string }) => {
    const url = new URL(GAS_URL);
    url.searchParams.set('action', 'export_csv');
    url.searchParams.set('secret', GAS_SECRET);
    if (params?.status) url.searchParams.set('status', params.status);
    window.open(url.toString(), '_blank');
  },
};
