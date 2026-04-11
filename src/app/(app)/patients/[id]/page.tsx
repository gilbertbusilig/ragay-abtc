'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Patient, Incident, Dose, PetMonitor, User } from '@/types';
import { useAuth } from '@/lib/auth';

const BODY_SITES = ['Head','Face','Neck','R.Arm','L.Arm','R.Hand','L.Hand','Chest','Abdomen','Upper Back','Lower Back','R.Leg','L.Leg','R.Foot','L.Foot'];
function getLocalISODate() {
  const now = new Date();
  const tzOffsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffsetMs).toISOString().split('T')[0];
}

// Date helpers
function toMMDDYYYY(iso: string) {
  if (!iso) return '—';
  const d = iso.includes('T') ? iso.split('T')[0] : iso;
  const [y, m, dd] = d.split('-');
  return `${m}/${dd}/${y}`;
}
function toISO(mmddyyyy: string) {
  if (!mmddyyyy) return '';
  const [m, d, y] = mmddyyyy.split('/');
  return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
}
function addDays(isoDate: string, days: number) {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
const DAY_OFFSETS: Record<string,number> = { D0:0, D3:3, D7:6, D14:13, D21:20, D28:27 };

function BodyDiagram({ selected, onChange }: { selected: string[]; onChange?: (s: string[]) => void }) {
  const toggle = (site: string) => {
    if (!onChange) return;
    onChange(selected.includes(site) ? selected.filter(s => s !== site) : [...selected, site]);
  };
  return (
    <div>
      <div style={{ fontSize:11, color:'var(--slate-500)', marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600 }}>Anatomical Position</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
        {BODY_SITES.map(site => (
          <button key={site} type="button" onClick={() => toggle(site)}
            style={{
              padding:'4px 10px', borderRadius:20, fontSize:12, border:'1.5px solid', cursor: onChange ? 'pointer' : 'default', transition:'all .12s',
              borderColor: selected.includes(site) ? 'var(--red-500)' : 'var(--slate-200)',
              background: selected.includes(site) ? '#fee2e2' : 'white',
              color: selected.includes(site) ? 'var(--red-700)' : 'var(--slate-500)',
              fontWeight: selected.includes(site) ? 600 : 400,
            }}>
            {site}
          </button>
        ))}
      </div>
    </div>
  );
}

function DoseTable({ doses, allUsers, onAdminister, onDateChange, onDeleteDose, userRole }: {
  doses: Dose[];
  allUsers: Record<string, User>;
  onAdminister: (dose: Dose) => void;
  onDateChange: (dose: Dose, newDate: string) => void;
  onDeleteDose: (dose: Dose) => void;
  userRole: string;
}) {
  const stripTextGuard = (v: any) => {
    let s = String(v ?? '').trim();
    if (s.startsWith("'")) s = s.slice(1).trim();
    return s;
  };
  const pickDoseField = (d: any, keys: string[]) => {
    for (const k of keys) {
      if (d?.[k] !== undefined && d?.[k] !== null && String(d[k]).trim() !== '') return stripTextGuard(d[k]);
    }
    return '';
  };
  const cleanBatchNo = (v: any) => {
    if (v === null || v === undefined) return '';
    let s = stripTextGuard(v);
    if (!s) return '';
    // Avoid showing raw ISO timestamps in Batch/Lot display.
    if (s.includes('T') && s.endsWith('Z')) return s.split('T')[0];
    return s;
  };
  const doseRoute = (d: any) => {
    const raw = pickDoseField(d, ['route', 'Route', 'dose_route', 'vaccine_route']);
    if (!raw) return '';
    const lower = raw.toLowerCase().trim();
    if (lower === 'intramuscular' || lower === 'im') return 'Intramuscular';
    if (lower === 'intradermal' || lower === 'id') return 'Intradermal';
    return '';
  };
  const isDoseGiven = (d: any) => !!String(d?.administered_date || '').trim() || String(d?.status || '').toLowerCase() === 'done';
  const doseAmount = (d: any) => {
    if (!isDoseGiven(d)) return '';
    const raw = pickDoseField(d, ['dose_volume', 'Dose', 'dose', 'volume', 'Volume', 'Dose Volume']);
    if (!raw || raw.toLowerCase() === 'false' || raw.toLowerCase() === 'true') return '';
    const normalized = raw.toLowerCase().replace(/\s+/g, '').replace(/[.,;]+$/g, '');
    if (normalized === '0.1ml' || normalized === '0.1') return '0.1 ml';
    if (normalized === '0.5ml' || normalized === '0.5') return '0.5 ml';
    if (normalized === '1ml' || normalized === '1.0ml' || normalized === '1' || normalized === '1.0') return '1.0 ml';
    return '';
  };

  const statusBadge = (s: string, optional: boolean) => {
    if (optional && s === 'scheduled') return <span className="badge" style={{ background:'#f1f5f9', color:'#94a3b8', border:'1px solid #e2e8f0' }}>Optional</span>;
    const map: Record<string,string> = { done:'badge-done', scheduled:'badge-scheduled', overdue:'badge-overdue' };
    return <span className={`badge ${map[s] || ''}`}>{s}</span>;
  };
  const userName = (id: string) => {
    if (!id) return '—';
    const u = allUsers[id];
    return u ? `${u.full_name}${u.credential ? `, ${u.credential}` : ''}` : id;
  };
  const canEdit = userRole === 'nurse' || userRole === 'admin';
  const canDelete = userRole === 'admin';

  return (
    <div className="table-wrap">
      <table className="data-table" style={{ tableLayout:'auto', width:'100%', minWidth:1140 }}>
        <thead><tr>
          <th style={{ width:56, whiteSpace:'nowrap' }}>Day</th>
          <th style={{ width:132, whiteSpace:'nowrap' }}>Scheduled Date</th>
          <th style={{ width:96, whiteSpace:'nowrap' }}>Status</th>
          <th style={{ width:84, whiteSpace:'nowrap' }}>Vaccine</th>
          <th style={{ width:108, whiteSpace:'nowrap' }}>Brand</th>
          <th style={{ width:98, whiteSpace:'nowrap' }}>Batch</th>
          <th style={{ width:108, whiteSpace:'nowrap' }}>Route</th>
          <th style={{ width:110, whiteSpace:'nowrap' }}>Dose</th>
          <th style={{ width:178, whiteSpace:'nowrap' }}>Administered By</th>
          <th style={{ width:118, whiteSpace:'nowrap' }}>Date Given</th>
          {canEdit && <th></th>}
        </tr></thead>
        <tbody>
          {doses.map(d => (
            <tr key={d.dose_id || d.dose_day} style={{ opacity: d.is_optional && d.status === 'scheduled' ? .55 : 1 }}>
              <td style={{ whiteSpace:'nowrap' }}><span style={{ fontWeight:700, color:'var(--blue-700)', fontSize:13 }}>{d.dose_day}</span></td>
              <td style={{ whiteSpace:'nowrap' }}>
                {/* D0 scheduled date is auto-set to the administered date — never editable */}
                {d.dose_day === 'D0' ? (
                  <span style={{ fontSize:12, color: d.status === 'done' ? 'inherit' : 'var(--slate-400)' }}>
                    {d.status === 'done' && d.scheduled_date ? toMMDDYYYY(d.scheduled_date) : '—'}
                  </span>
                ) : canEdit && d.status !== 'done' ? (
                  <input
                    type="date"
                    defaultValue={d.scheduled_date || ''}
                    style={{ border:'1px solid var(--slate-200)', borderRadius:6, padding:'3px 7px', fontSize:12, fontFamily:'var(--font-sans)', width:130 }}
                    onBlur={e => {
                      const newDate = e.target.value;
                      if (newDate && newDate !== d.scheduled_date) onDateChange(d, newDate);
                    }}
                  />
                ) : (
                  <span style={{ fontSize:12 }}>{toMMDDYYYY(d.scheduled_date)}</span>
                )}
              </td>
              <td style={{ whiteSpace:'nowrap' }}>{statusBadge(d.status, !!d.is_optional)}</td>
              <td style={{ fontSize:12, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{d.vaccine_type || '—'}</td>
              <td style={{ fontSize:12, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{d.brand_name || '—'}</td>
              <td style={{ fontSize:12, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{cleanBatchNo(pickDoseField(d, ['batch_no', 'Batch No.', 'Batch No', 'Batch / Lot Number'])) || '—'}</td>
              <td style={{ fontSize:12, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{doseRoute(d) || '—'}</td>
              <td style={{ fontSize:12, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{doseAmount(d) || '—'}</td>
              <td style={{ fontSize:12, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{userName(d.administered_by)}</td>
              <td style={{ fontSize:12, whiteSpace:'nowrap' }}>{d.administered_date ? toMMDDYYYY(d.administered_date) : '—'}</td>
              {canEdit && (
                <td>
                  <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                    {d.status !== 'done' && (
                      <button className="btn btn-primary btn-sm" onClick={() => onAdminister(d)}>
                        Give Dose
                      </button>
                    )}
                    {canDelete && (
                      <button className="btn btn-danger btn-sm" onClick={() => onDeleteDose(d)}>
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Session cache for accounts - avoid refetching on every page visit
const accountsCache: { data: Record<string,User> | null; ts: number } = { data: null, ts: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default function PatientDetailPage() {
  const { user, activeNurse } = useAuth();
  const router = useRouter();
  const params = useParams();
  const patient_id = params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [doses, setDoses] = useState<Dose[]>([]);
  const [monitors, setMonitors] = useState<PetMonitor[]>([]);
  const [allUsers, setAllUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  const [adminModal, setAdminModal] = useState<Dose | null>(null);
  const [doseForm, setDoseForm] = useState({
    vaccine_type: 'PVRV',
    brand_name: '',
    batch_no: '',
    administered_date: '',
    route: 'Intramuscular',
    dose_volume: '0.5 ml',
    from_other_facility: false,
    administered_by_other: '',
  });
  const [petOutcomeModal, setPetOutcomeModal] = useState<PetMonitor | null>(null);
  const [petOutcome, setPetOutcome] = useState<'healthy' | 'perished'>('healthy');
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'patient' | 'incident' | 'dose'; id: string; dose?: Dose } | null>(null);
  const [editPatientOpen, setEditPatientOpen] = useState(false);
  const [editPatientForm, setEditPatientForm] = useState({ weight:'', contact_no:'', address:'' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ msg:'', type:'' });
  const currentActor = user?.role === 'nurse' && activeNurse ? activeNurse : user;

  const showToast = useCallback((msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg:'', type:'' }), 4000);
  }, []);

  useEffect(() => { load(); }, [patient_id]);

  async function load() {
    setLoading(true);
    // Load patient data + use cached accounts if fresh
    const now = Date.now();
    const useCached = accountsCache.data && (now - accountsCache.ts) < CACHE_TTL;

    const requests: Promise<any>[] = [api.getPatient(patient_id)];
    if (!useCached) requests.push(api.getInitData());

    const results = await Promise.all(requests);
    const patRes = results[0];

    if (patRes.status === 'ok') {
      setPatient(patRes.data.patient);
      setIncidents(patRes.data.incidents || []);
      setDoses(patRes.data.doses || []);
      setMonitors(patRes.data.monitors || []);
      const incs = patRes.data.incidents || [];
      if (incs.length > 0) setActiveIncident(incs[incs.length - 1]);
    }

    if (!useCached && results[1]?.status === 'ok') {
      const map: Record<string, User> = {};
      // Include all accounts AND nurses so administered_by resolves to a name
      (results[1].data.accounts || []).forEach((u: any) => { map[u.user_id] = u; });
      (results[1].data.nurses  || []).forEach((u: any) => { if (!map[u.user_id]) map[u.user_id] = u; });
      accountsCache.data = map;
      accountsCache.ts = Date.now();
      setAllUsers(map);
    } else if (useCached && accountsCache.data) {
      setAllUsers(accountsCache.data);
    }

    setLoading(false);
  }

  async function submitDose() {
    if (!adminModal) return;
    setSaving(true);
    const by = user?.role === 'nurse' && activeNurse ? activeNurse.user_id : user?.user_id;
    const administeredBy = doseForm.from_other_facility
      ? String(doseForm.administered_by_other || '').trim()
      : (by || '');
    if (!administeredBy) {
      setSaving(false);
      showToast('Please enter who administered this dose in the other facility', 'error');
      return;
    }
    const today = getLocalISODate();
    const res = await api.administerDose({
      dose_id:         adminModal.dose_id || '',
      patient_id:      adminModal.patient_id,
      incident_id:     adminModal.incident_id,
      dose_day:        adminModal.dose_day,
      scheduled_date:  adminModal.scheduled_date,
      vaccine_type:    doseForm.vaccine_type,
      brand_name:      doseForm.brand_name,
      batch_no:        doseForm.batch_no,
      administered_by: administeredBy,
      administered_date: doseForm.administered_date || today,
      route: doseForm.route,
      dose_volume: doseForm.dose_volume,
    });
    setSaving(false);
    setAdminModal(null);
    if (res.status === 'ok') {
      if (res.data?.dose) {
        const updatedDose = res.data.dose as Dose;
        setDoses(prev => {
          // Update the dose that was just administered
          let next = prev.map(d =>
            (d.dose_id && updatedDose.dose_id && d.dose_id === updatedDose.dose_id) ||
            (d.incident_id === updatedDose.incident_id && d.dose_day === updatedDose.dose_day)
              ? { ...d, ...updatedDose }
              : d
          );
          // If D0 was just given, recalculate scheduled dates for all other doses in this incident
          if (updatedDose.dose_day === 'D0' && updatedDose.administered_date) {
            const d0Date = updatedDose.administered_date;
            next = next.map(d => {
              if (d.incident_id !== updatedDose.incident_id) return d;
              if (d.dose_day === 'D0') return d; // D0 scheduled_date already set
              if (d.status === 'done') return d;  // never shift a dose already given
              const offset = DAY_OFFSETS[d.dose_day];
              if (offset === undefined) return d;
              return { ...d, scheduled_date: addDays(d0Date, offset) };
            });
          }
          return next;
        });
      } else {
        load();
      }
      showToast('Dose recorded ✓');
    }
    else showToast('Error: ' + res.message, 'error');
  }

  async function handleDoseDateChange(dose: Dose, newDate: string) {
    await api.updateDoseDate({
      dose_id:     dose.dose_id || '',
      incident_id: dose.incident_id,
      dose_day:    dose.dose_day,
      scheduled_date: newDate,
    });
    // Update local state immediately - no full reload needed
    setDoses(prev => prev.map(d =>
      (d.dose_id ? d.dose_id === dose.dose_id : d.dose_day === dose.dose_day && d.incident_id === dose.incident_id)
        ? { ...d, scheduled_date: newDate }
        : d
    ));
  }

  async function submitPetOutcome() {
    if (!petOutcomeModal) return;
    setSaving(true);
    const by = user?.role === 'nurse' && activeNurse ? activeNurse.user_id : user?.user_id;
    const res = await api.updatePetMonitor({
      monitor_id: petOutcomeModal.monitor_id,
      outcome: petOutcome,
      outcome_date: getLocalISODate(),
      recorded_by: by,
    });
    setSaving(false);
    setPetOutcomeModal(null);
    if (res.status === 'ok') {
      showToast(petOutcome === 'perished' ? 'Pet perished - continue full treatment' : 'Pet healthy - inform doctor');
      setMonitors(prev => prev.map(m =>
        m.monitor_id === petOutcomeModal.monitor_id
          ? { ...m, outcome: petOutcome, outcome_date: getLocalISODate(), recorded_by: by || '' }
          : m
      ));
    }
  }

  async function savePatientInfo() {
    if (!patient) return;
    setSaving(true);
    const by = user?.role === 'nurse' && activeNurse ? activeNurse.user_id : user?.user_id;
    const updates: Record<string, string> = { patient_id: patient.patient_id, updated_by: by || '' };
    if (editPatientForm.weight)     updates.weight     = editPatientForm.weight;
    if (editPatientForm.contact_no) updates.contact_no = editPatientForm.contact_no;
    if (editPatientForm.address)    updates.address    = editPatientForm.address;
    const res = await api.updatePatient(updates);
    setSaving(false);
    setEditPatientOpen(false);
    if (res.status === 'ok') {
      setPatient(prev => prev ? ({
        ...prev,
        ...(editPatientForm.weight ? { weight: editPatientForm.weight } : {}),
        ...(editPatientForm.contact_no ? { contact_no: editPatientForm.contact_no } : {}),
        ...(editPatientForm.address ? { address: editPatientForm.address } : {}),
      }) : prev);
      showToast('Patient info updated');
    }
    else showToast('Error: ' + res.message, 'error');
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    setSaving(true);
    let res;
    if (deleteConfirm.type === 'patient') {
      res = await api.deletePatient(patient_id);
      if (res?.status === 'ok') { router.push('/patients'); return; }
    } else if (deleteConfirm.type === 'dose' && deleteConfirm.dose) {
      res = await api.deleteDose({
        dose_id: deleteConfirm.dose.dose_id || '',
        incident_id: deleteConfirm.dose.incident_id,
        patient_id: deleteConfirm.dose.patient_id,
        dose_day: deleteConfirm.dose.dose_day,
      });
      if (res?.status === 'ok') {
        const clearedDose = res.data?.dose;
        if (clearedDose) {
          setDoses(prev => prev.map(d => {
            const isClearedDose =
              (clearedDose.dose_id && d.dose_id === clearedDose.dose_id) ||
              (d.incident_id === clearedDose.incident_id && d.dose_day === clearedDose.dose_day);
            if (isClearedDose) return { ...d, ...clearedDose };

            // If D0 is deleted, clear scheduled dates of related doses because they are D0-derived.
            if (clearedDose.dose_day === 'D0' && d.incident_id === clearedDose.incident_id) {
              const next: Dose = { ...d, scheduled_date: '' };
              if (!d.administered_date) next.status = 'scheduled';
              return next;
            }
            return d;
          }));
        } else {
          load();
        }
        showToast('Dose data cleared');
      }
    } else {
      res = await api.deleteIncident(deleteConfirm.id);
      if (res?.status === 'ok') { showToast('Incident deleted'); load(); }
    }
    setSaving(false);
    setDeleteConfirm(null);
    if (res?.status !== 'ok') showToast('Error: ' + res?.message, 'error');
  }

  const incidentDoses = useMemo(() => {
    if (!activeIncident) return [];
    const rows = doses.filter(
      d => String(d.incident_id || '').trim() === String(activeIncident.incident_id || '').trim() && String(d.status || '').toLowerCase() !== 'skipped'
    );
    const byDay = new Map<string, Dose>();
    const pick = (obj: any, keys: string[]) => {
      for (const k of keys) {
        const v = obj?.[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
      }
      return '';
    };
    rows.forEach(d => {
      const key = d.dose_day;
      const prev = byDay.get(key);
      if (!prev) { byDay.set(key, d); return; }
      const prevRoute = pick(prev, ['route', 'Route', 'dose_route', 'vaccine_route']);
      const nextRoute = pick(d, ['route', 'Route', 'dose_route', 'vaccine_route']);
      const prevDose = pick(prev, ['dose_volume', 'Dose', 'dose', 'volume', 'Volume', 'Dose Volume']);
      const nextDose = pick(d, ['dose_volume', 'Dose', 'dose', 'volume', 'Volume', 'Dose Volume']);
      const prevScore =
        (prev.status === 'done' ? 100 : 0) +
        (prev.administered_date ? 10 : 0) +
        (prev.brand_name ? 1 : 0) +
        (prevRoute ? 1 : 0) +
        (prevDose ? 1 : 0);
      const nextScore =
        (d.status === 'done' ? 100 : 0) +
        (d.administered_date ? 10 : 0) +
        (d.brand_name ? 1 : 0) +
        (nextRoute ? 1 : 0) +
        (nextDose ? 1 : 0);
      if (nextScore >= prevScore) byDay.set(key, d);
    });
    return Array.from(byDay.values());
  }, [activeIncident, doses]);
  const formatDate = (d: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month:'long', day:'numeric', year:'numeric' }) : '—';
  const getUserName = (id: string) => {
    if (!id) return '—';
    const u = allUsers[id];
    return u ? `${u.full_name}${u.credential ? `, ${u.credential}` : ''}` : id;
  };

  const activeMonitor = useMemo(
    () => (activeIncident ? monitors.find(m => m.incident_id === activeIncident.incident_id) : null),
    [activeIncident, monitors]
  );
  const monitorReady = useMemo(
    () => (activeMonitor ? new Date() >= new Date(activeMonitor.monitor_end + 'T00:00:00') : false),
    [activeMonitor]
  );
  const activeIncidentPositions = useMemo(() => {
    if (!activeIncident?.anatomical_positions) return [];
    try { return JSON.parse(activeIncident.anatomical_positions); }
    catch { return []; }
  }, [activeIncident]);
  const completedDosesCount = useMemo(
    () => incidentDoses.filter(d => d.status === 'done').length,
    [incidentDoses]
  );
  const requiredDosesCount = useMemo(
    () => incidentDoses.filter(d => !d.is_optional).length,
    [incidentDoses]
  );

  if (loading) return <div className="page-loader"><div className="spinner dark" style={{ width:28, height:28 }} /></div>;
  if (!patient) return <div className="page-body"><div className="card"><div className="empty-state"><div className="empty-text">Patient not found</div></div></div></div>;

  return (
    <div>
      <div className="page-header no-print">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => router.push('/patients')} style={{ marginBottom:6 }}>← Patient Records</button>
          <h1 className="page-title">{patient.full_name}</h1>
          <p className="page-subtitle" style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontFamily:'monospace', color:'var(--blue-700)', fontWeight:700 }}>{patient.patient_id}</span>
            <span className={`badge badge-${patient.status}`}>{patient.status}</span>
          </p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/patients/${patient_id}/print`)}>🖨 Print Form</button>
          <button className="btn btn-primary" onClick={() => router.push(`/patients/${patient_id}/incident/new`)}>+ New Incident</button>
          {user?.role === 'admin' && (
            <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm({ type:'patient', id:patient_id })}>🗑 Delete Patient</button>
          )}
        </div>
      </div>

      <div className="page-body">
        <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:18 }}>

          {/* Left — Patient info */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title">Patient Information</span>
                {(user?.role === 'nurse' || user?.role === 'admin' || user?.role === 'doctor') && (
                  <button className="btn btn-secondary btn-sm" onClick={() => {
                    setEditPatientForm({ weight: String(patient.weight||''), contact_no: patient.contact_no||'', address: patient.address||'' });
                    setEditPatientOpen(true);
                  }}>✏️ Edit</button>
                )}
              </div>
              <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { label:'Patient ID',    val: patient.patient_id, mono: true },
                  { label:'Full Name',     val: patient.full_name },
                  { label:'Sex',           val: patient.sex === 'M' ? '♂ Male' : patient.sex === 'F' ? '♀ Female' : '—' },
                  { label:'Age',           val: patient.age ? `${patient.age} yrs` : '—' },
                  { label:'Date of Birth', val: formatDate(patient.date_of_birth) },
                  { label:'Weight',        val: patient.weight ? `${patient.weight} kg` : '—' },
                  { label:'Address',       val: patient.address || '—' },
                  { label:'Contact',       val: patient.contact_no || '—' },
                ].map(row => (
                  <div key={row.label} style={{ display:'flex', justifyContent:'space-between', fontSize:13, gap:8, paddingBottom:6, borderBottom:'1px solid #f1f5f9' }}>
                    <span style={{ color:'var(--slate-400)', flexShrink:0, fontSize:12 }}>{row.label}</span>
                    <span style={{ fontWeight:500, textAlign:'right', fontFamily:(row as any).mono ? 'monospace' : undefined, color:(row as any).mono ? 'var(--blue-700)' : undefined }}>
                      {row.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pet monitor card */}
            {activeMonitor && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">🐾 Pet Monitor (14-day)</span>
                  <span className={`badge ${activeMonitor.outcome==='perished'?'badge-overdue':activeMonitor.outcome==='healthy'?'badge-done':'badge-scheduled'}`}>
                    {activeMonitor.outcome}
                  </span>
                </div>
                <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                    <span style={{ color:'var(--slate-500)' }}>Period</span>
                    <span>{toMMDDYYYY(activeMonitor.monitor_start)} – {toMMDDYYYY(activeMonitor.monitor_end)}</span>
                  </div>
                  {activeMonitor.outcome === 'unknown' && !monitorReady && (
                    <div className="alert alert-blue" style={{ fontSize:12, marginBottom:0 }}>
                      ⏳ Monitoring ends {formatDate(activeMonitor.monitor_end)}
                    </div>
                  )}
                  {activeMonitor.outcome === 'unknown' && monitorReady && (user?.role === 'nurse' || user?.role === 'admin') && (
                    <button className="btn btn-primary btn-sm" onClick={() => { setPetOutcomeModal(activeMonitor); setPetOutcome('healthy'); }}>
                      Record Pet Outcome
                    </button>
                  )}
                  {activeMonitor.outcome !== 'unknown' && (
                    <div style={{ fontSize:12, color:'var(--slate-500)' }}>Recorded: {formatDate(activeMonitor.outcome_date)}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right — Incidents + Doses */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {incidents.length > 0 ? (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Bite Incidents ({incidents.length})</span>
                </div>
                <div style={{ padding:'10px 18px', borderBottom:'1px solid #f1f5f9', display:'flex', gap:8, flexWrap:'wrap' }}>
                  {incidents.map((inc, i) => (
                    <button key={inc.incident_id}
                      className={activeIncident?.incident_id === inc.incident_id ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary'}
                      onClick={() => setActiveIncident(inc)}>
                      Incident #{i+1} — {inc.consult_date ? toMMDDYYYY(inc.consult_date) : ''}
                      {inc.wound_category && (
                        <span className={`badge badge-cat${inc.wound_category==='I'?'1':inc.wound_category==='II'?'2':'3'}`} style={{ marginLeft:6 }}>
                          Cat {inc.wound_category}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {activeIncident && (
                  <div className="card-body">
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
                      <div>
                        <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--slate-400)', fontWeight:700, marginBottom:8 }}>Exposure Detail</div>
                        {[
                          { l:'Date of Bite', v: activeIncident.bite_datetime ? new Date(activeIncident.bite_datetime).toLocaleDateString('en-PH') : '—' },
                          { l:'Animal', v: activeIncident.animal_type ? (activeIncident.animal_type.charAt(0).toUpperCase()+activeIncident.animal_type.slice(1)) + (activeIncident.animal_other ? ` (${activeIncident.animal_other})` : '') : '—' },
                          { l:'Ownership', v: activeIncident.ownership?.replace(/_/g,' ') || '—' },
                          { l:'Circumstance', v: activeIncident.circumstance || '—' },
                          { l:'Place', v: activeIncident.place_of_exposure || '—' },
                        ].map(r => (
                          <div key={r.l} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0', borderBottom:'1px solid #f8fafc' }}>
                            <span style={{ color:'var(--slate-400)' }}>{r.l}</span>
                            <span style={{ fontWeight:500, textTransform:'capitalize', textAlign:'right', maxWidth:180 }}>{r.v}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--slate-400)', fontWeight:700, marginBottom:8 }}>Wound & Treatment</div>
                        {[
                          { l:'Category', v: activeIncident.wound_category ? `Category ${activeIncident.wound_category}` : '—' },
                          { l:'Wound Status', v: activeIncident.wound_status?.replace(/_/g,' ') || '—' },
                          { l:'ERIG/HRIG', v: activeIncident.erig_hrig || 'None' },
                          { l:'Tetanus', v: activeIncident.tetanus_vaccine_status === 'Y' ? `Yes (${activeIncident.tetanus_date||'not set'})` : activeIncident.tetanus_vaccine_status === 'N' ? `No → ${activeIncident.tetanus_type||'?'}` : '—' },
                          { l:'Assessed by', v: getUserName(activeIncident.referring_doctor) },
                          { l:'Status', v: activeIncident.status },
                        ].map(r => (
                          <div key={r.l} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0', borderBottom:'1px solid #f8fafc' }}>
                            <span style={{ color:'var(--slate-400)' }}>{r.l}</span>
                            <span style={{ fontWeight:500, textTransform:'capitalize', textAlign:'right', maxWidth:180 }}>{r.v}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {activeIncident.anatomical_positions && (
                      <div style={{ marginBottom:14 }}>
                        <BodyDiagram selected={activeIncidentPositions} />
                      </div>
                    )}

                    <div className="alert alert-blue" style={{ marginBottom:12, fontSize:12 }}>
                      <span>ℹ</span> Update clinical data first, then review and record entries in the vaccine schedule below.
                    </div>

                    {activeIncident.physician_notes && (
                      <div style={{ background:'var(--blue-50)', border:'1px solid var(--blue-200)', borderRadius:'var(--radius-md)', padding:'10px 12px', fontSize:13, marginBottom:12 }}>
                        <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--blue-600)', fontWeight:700, marginBottom:5 }}>Physician Notes</div>
                        {activeIncident.physician_notes}
                      </div>
                    )}

                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {(user?.role === 'doctor' || user?.role === 'admin' || user?.role === 'nurse') && (
                        <button className="btn btn-secondary btn-sm"
                          onClick={() => router.push(`/patients/${patient_id}/incident/${activeIncident.incident_id}/edit`)}>
                          ✏️ Update Clinical Data
                        </button>
                      )}
                      <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/patients/${patient_id}/print`)}>
                        🖨 Print Form
                      </button>
                      {user?.role === 'admin' && (
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm({ type:'incident', id:activeIncident.incident_id })}>
                          🗑 Delete Incident
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-icon">🩺</div>
                  <div className="empty-text">No incidents recorded</div>
                </div>
              </div>
            )}

            {/* Dose schedule */}
            {activeIncident && incidentDoses.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">💉 Vaccine Schedule</span>
                  <span style={{ fontSize:12, color:'var(--slate-500)' }}>
                    {completedDosesCount} / {requiredDosesCount} required doses
                  </span>
                </div>
                <div className="alert alert-blue" style={{ margin:'8px 16px 0', fontSize:12 }}>
                  <span>ℹ</span> Scheduled dates are editable — click any date to change it. Each dose is independent.
                </div>
                <DoseTable
                  doses={incidentDoses}
                  allUsers={allUsers}
                  onAdminister={d => {
                    setAdminModal(d);
                    setDoseForm({
                      vaccine_type:'PVRV',
                      brand_name:'',
                      batch_no:'',
                      administered_date: getLocalISODate(),
                      route:'Intramuscular',
                      dose_volume:'0.5 ml',
                      from_other_facility: false,
                      administered_by_other: '',
                    });
                  }}
                  onDateChange={handleDoseDateChange}
                  onDeleteDose={d => setDeleteConfirm({ type:'dose', id:d.dose_id || `${d.incident_id}:${d.dose_day}`, dose:d })}
                  userRole={user?.role || ''}
                />
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Administer dose modal ── */}
      {adminModal && (
        <div className="modal-overlay" onClick={() => setAdminModal(null)}>
          <div className="modal" style={{ maxWidth:500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Administer Dose — {adminModal.dose_day}</h2>
              <button className="btn btn-ghost btn-icon" style={{ color:'white' }} onClick={() => setAdminModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background:'var(--blue-50)', borderRadius:'var(--radius-md)', padding:'10px 14px', marginBottom:16, fontSize:13, color:'var(--blue-700)' }}>
                Scheduled: <strong>{toMMDDYYYY(adminModal.scheduled_date)}</strong> · Day: <strong>{adminModal.dose_day}</strong>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="checkbox-item" style={{ marginBottom:8 }}>
                    <input
                      type="checkbox"
                      checked={!!doseForm.from_other_facility}
                      onChange={e => setDoseForm(p => ({...p, from_other_facility: e.target.checked}))}
                      style={{ width:16, height:16, accentColor:'var(--blue-600)' }}
                    />
                    Dose started from another facility
                  </label>
                  <label className="form-label">
                    {doseForm.from_other_facility ? 'Administered By (Other Facility)' : 'Administered By'}
                  </label>
                  {doseForm.from_other_facility ? (
                    <input
                      className="form-input"
                      type="text"
                      value={doseForm.administered_by_other}
                      onChange={e => setDoseForm(p => ({...p, administered_by_other: e.target.value}))}
                      placeholder="Enter name / facility"
                    />
                  ) : (
                    <input className="form-input" type="text" readOnly value={currentActor ? `${currentActor.full_name}${currentActor.credential ? `, ${currentActor.credential}` : ''}` : ''} style={{ background:'var(--slate-50)' }} />
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Date Administered</label>
                  <input className="form-input" type="date"
                    value={doseForm.administered_date}
                    onChange={e => setDoseForm(p => ({...p, administered_date: e.target.value}))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Vaccine Type *</label>
                  <div className="checkbox-group">
                    {['PVRV','PCEC'].map(v => (
                      <label key={v} className="checkbox-item">
                        <input type="radio" name="vtype" value={v} checked={doseForm.vaccine_type===v}
                          onChange={() => setDoseForm(p => ({...p, vaccine_type:v}))} />
                        {v}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Brand Name</label>
                  <input className="form-input" type="text" value={doseForm.brand_name}
                    onChange={e => setDoseForm(p => ({...p, brand_name:e.target.value}))}
                    placeholder="e.g. Verorab, Rabipur…" />
                </div>
                <div className="form-group">
                  <label className="form-label">Batch / Lot Number</label>
                  <input className="form-input" type="text" value={doseForm.batch_no}
                    onChange={e => setDoseForm(p => ({...p, batch_no:e.target.value}))}
                    placeholder="Batch No." />
                </div>
                <div className="form-group">
                  <label className="form-label">Route</label>
                  <div className="checkbox-group">
                    {['Intradermal','Intramuscular'].map(r => (
                      <label key={r} className="checkbox-item">
                        <input type="radio" name="dose_route" value={r} checked={doseForm.route===r}
                          onChange={() => setDoseForm(p => ({...p, route:r}))} />
                        {r}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Dose</label>
                  <select className="form-select" value={doseForm.dose_volume}
                    onChange={e => setDoseForm(p => ({...p, dose_volume:e.target.value}))}>
                    <option value="0.1 ml">0.1 ml</option>
                    <option value="0.5 ml">0.5 ml</option>
                    <option value="1.0 ml">1.0 ml</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAdminModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitDose} disabled={saving}>
                {saving ? <><span className="spinner"/>  Saving…</> : '✓ Record Dose'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pet outcome modal ── */}
      {petOutcomeModal && (
        <div className="modal-overlay" onClick={() => setPetOutcomeModal(null)}>
          <div className="modal" style={{ maxWidth:440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">🐾 Record Pet Outcome</h2>
              <button className="btn btn-ghost btn-icon" style={{ color:'white' }} onClick={() => setPetOutcomeModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize:14, color:'var(--slate-600)', marginBottom:16 }}>The 14-day monitoring period has ended. What is the condition of the patient's pet?</p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  { val:'healthy' as const, icon:'✅', title:'Pet is Healthy / Alive', desc:'Doctor may consider discontinuing treatment', color:'var(--green-700)', borderColor: petOutcome==='healthy' ? 'var(--blue-500)' : 'var(--slate-200)', bg: petOutcome==='healthy' ? 'var(--blue-50)' : 'white' },
                  { val:'perished' as const, icon:'⚠️', title:'Pet Perished / Died', desc:'Continue full anti-rabies treatment immediately', color:'var(--red-700)', borderColor: petOutcome==='perished' ? 'var(--red-500)' : 'var(--slate-200)', bg: petOutcome==='perished' ? '#fff5f5' : 'white' },
                ].map(opt => (
                  <label key={opt.val} style={{ display:'flex', gap:12, padding:'12px 16px', borderRadius:'var(--radius-md)', border:'2px solid', borderColor: opt.borderColor, background: opt.bg, cursor:'pointer', transition:'all .12s' }}>
                    <input type="radio" name="pet_out" checked={petOutcome===opt.val} onChange={() => setPetOutcome(opt.val)} style={{ accentColor:'var(--blue-600)', marginTop:3 }} />
                    <div>
                      <div style={{ fontWeight:700, color: opt.color }}>{opt.icon} {opt.title}</div>
                      <div style={{ fontSize:12, color:'var(--slate-500)', marginTop:2 }}>{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPetOutcomeModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitPetOutcome} disabled={saving}>
                {saving ? <><span className="spinner"/>  Saving…</> : '✓ Record Outcome'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit patient info modal ── */}
      {editPatientOpen && patient && (
        <div className="modal-overlay" onClick={() => setEditPatientOpen(false)}>
          <div className="modal" style={{ maxWidth:480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Update Patient Information</h2>
              <button className="btn btn-ghost btn-icon" style={{ color:'white' }} onClick={() => setEditPatientOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:12 }}>
                  <div className="form-group">
                    <label className="form-label">Weight (kg)</label>
                    <input className="form-input" type="number" step="0.1" min="0"
                      value={editPatientForm.weight} placeholder={String(patient.weight||'')}
                      onChange={e => setEditPatientForm(p => ({...p, weight:e.target.value}))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Contact No.</label>
                  <input className="form-input" type="tel"
                    value={editPatientForm.contact_no} placeholder={patient.contact_no||'09XX-XXX-XXXX'}
                    onChange={e => setEditPatientForm(p => ({...p, contact_no:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input className="form-input" type="text"
                    value={editPatientForm.address} placeholder={patient.address||'Barangay, Municipality…'}
                    onChange={e => setEditPatientForm(p => ({...p, address:e.target.value}))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditPatientOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={savePatientInfo} disabled={saving}>
                {saving ? <><span className="spinner"/>  Saving…</> : '✓ Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth:400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ background:'var(--red-600)' }}>
              <h2 className="modal-title">⚠️ Confirm Delete</h2>
              <button className="btn btn-ghost btn-icon" style={{ color:'white' }} onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize:14, color:'var(--slate-700)' }}>
                {deleteConfirm.type === 'patient'
                  ? 'Delete this patient and ALL their incidents, doses, and records? This cannot be undone.'
                  : deleteConfirm.type === 'dose'
                  ? `Delete vaccine schedule entry ${deleteConfirm.dose?.dose_day || ''}? This cannot be undone.`
                  : 'Delete this incident and all related dose schedules? This cannot be undone.'}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                {saving ? <><span className="spinner"/>  Deleting…</> : '🗑 Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.msg && (
        <div className="toast-container">
          <div className={`toast ${toast.type === 'error' ? 'error' : 'success'}`}>{toast.msg}</div>
        </div>
      )}
    </div>
  );
}

