// lib/api.ts — Frontend API client for GAS backend

const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL!;
const GAS_SECRET = process.env.NEXT_PUBLIC_GAS_SECRET!;

async function gasGet(action: string, params: Record<string, string> = {}) {
  try {
    const url = new URL(GAS_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('secret', GAS_SECRET);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
    const res = await fetch(url.toString(), { redirect: 'follow' });
    const text = await res.text();
    try { return JSON.parse(text); }
    catch { return { status: 'error', message: 'Invalid response: ' + text.slice(0, 100) }; }
  } catch (err: any) {
    return { status: 'error', message: err?.message || 'Network error' };
  }
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
    try { return JSON.parse(text); }
    catch { return { status: 'error', message: 'Invalid response: ' + text.slice(0, 100) }; }
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
  getPatient: (patient_id: string) =>
    gasGet('get_patient', { patient_id }),
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
