'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Patient, Incident, Dose, PetMonitor, User } from '@/types';
import { useAuth } from '@/lib/auth';

const BODY_SITES = ['Head','Face','Neck','R.Arm','L.Arm','R.Hand','L.Hand','Chest','Abdomen','Upper Back','Lower Back','R.Leg','L.Leg','R.Foot','L.Foot'];

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
              padding:'4px 10px', borderRadius:20, fontSize:12,
              border:'1.5px solid',
              borderColor: selected.includes(site) ? 'var(--red-500)' : 'var(--slate-200)',
              background: selected.includes(site) ? '#fee2e2' : 'white',
              color: selected.includes(site) ? 'var(--red-700)' : 'var(--slate-500)',
              cursor: onChange ? 'pointer' : 'default',
              fontWeight: selected.includes(site) ? 600 : 400,
              transition:'all .12s',
            }}>
            {site}
          </button>
        ))}
      </div>
    </div>
  );
}

function DoseTable({ doses, allUsers, onAdminister, userRole }: {
  doses: Dose[];
  allUsers: Record<string, User>;
  onAdminister: (dose: Dose) => void;
  userRole: string;
}) {
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
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead><tr>
          <th>Day</th><th>Scheduled</th><th>Status</th><th>Vaccine</th><th>Brand</th><th>Batch</th><th>Administered By</th><th>Date Given</th>
          {(userRole === 'nurse' || userRole === 'admin') && <th></th>}
        </tr></thead>
        <tbody>
          {doses.map(d => (
            <tr key={d.dose_id} style={{ opacity: d.is_optional && d.status === 'scheduled' ? .55 : 1, background: d.is_optional && d.status === 'scheduled' ? '#fafafa' : undefined }}>
              <td><span style={{ fontWeight:700, color:'var(--blue-700)' }}>{d.dose_day}</span></td>
              <td style={{ fontSize:12 }}>{d.scheduled_date}</td>
              <td>{statusBadge(d.status, d.is_optional)}</td>
              <td style={{ fontSize:12 }}>{d.vaccine_type || '—'}</td>
              <td style={{ fontSize:12 }}>{d.brand_name || '—'}</td>
              <td style={{ fontSize:12 }}>{d.batch_no || '—'}</td>
              <td style={{ fontSize:12 }}>{userName(d.administered_by)}</td>
              <td style={{ fontSize:12 }}>{d.administered_date || '—'}</td>
              {(userRole === 'nurse' || userRole === 'admin') && (
                <td>
                  {d.status !== 'done' && !d.is_optional && (
                    <button className="btn btn-primary btn-sm" onClick={() => onAdminister(d)}>Administer</button>
                  )}
                  {d.is_optional && d.status !== 'done' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => onAdminister(d)}>Give</button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
  const [doseForm, setDoseForm] = useState({ vaccine_type: 'PVRV', brand_name: '', batch_no: '' });
  const [petOutcomeModal, setPetOutcomeModal] = useState<PetMonitor | null>(null);
  const [petOutcome, setPetOutcome] = useState<'healthy' | 'perished'>('healthy');
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'patient' | 'incident'; id: string } | null>(null);
  const [editPatientOpen, setEditPatientOpen] = useState(false);
  const [editPatientForm, setEditPatientForm] = useState({ weight:'', contact_no:'', address:'' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { load(); }, [patient_id]);

  async function load() {
    setLoading(true);
    const [patRes, usersRes] = await Promise.all([
      api.getPatient(patient_id),
      api.getAccounts(),
    ]);
    if (patRes.status === 'ok') {
      setPatient(patRes.data.patient);
      setIncidents(patRes.data.incidents || []);
      setDoses(patRes.data.doses || []);
      setMonitors(patRes.data.monitors || []);
      const incs = patRes.data.incidents || [];
      if (incs.length > 0) setActiveIncident(incs[incs.length - 1]);
    }
    if (usersRes.status === 'ok') {
      const map: Record<string, User> = {};
      usersRes.data.forEach((u: any) => { map[u.user_id] = u; });
      setAllUsers(map);
    }
    setLoading(false);
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
    if (res.status === 'ok') { showToast('Patient info updated ✓', 'success'); load(); }
    else showToast('Error: ' + res.message, 'error');
  }

  async function submitDose() {
    if (!adminModal) return;
    // Explicit null check — dose_id must exist
    if (!adminModal.dose_id) {
      showToast('Error: dose_id is missing. Please reload the page and try again.', 'error');
      setSaving(false);
      return;
    }
    setSaving(true);
    const by = user?.role === 'nurse' && activeNurse ? activeNurse.user_id : user?.user_id;
    const res = await api.administerDose({
      dose_id: adminModal.dose_id,
      vaccine_type: doseForm.vaccine_type,
      brand_name: doseForm.brand_name,
      batch_no: doseForm.batch_no,
      administered_by: by,
      administered_date: new Date().toISOString().split('T')[0],
    });
    setSaving(false);
    setAdminModal(null);
    if (res.status === 'ok') { showToast('Dose recorded ✓', 'success'); load(); }
    else showToast('Error: ' + res.message, 'error');
  }

  async function submitPetOutcome() {
    if (!petOutcomeModal) return;
    setSaving(true);
    const by = user?.role === 'nurse' && activeNurse ? activeNurse.user_id : user?.user_id;
    const res = await api.updatePetMonitor({
      monitor_id: petOutcomeModal.monitor_id,
      outcome: petOutcome,
      outcome_date: new Date().toISOString().split('T')[0],
      recorded_by: by,
    });
    setSaving(false);
    setPetOutcomeModal(null);
    if (res.status === 'ok') {
      showToast(petOutcome === 'perished' ? 'Pet perished — continue full treatment.' : 'Pet healthy — treatment may be discontinued per doctor.', 'success');
      load();
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    setSaving(true);
    let res;
    if (deleteConfirm.type === 'patient') {
      res = await api.deletePatient(patient_id);
      if (res.status === 'ok') { router.push('/patients'); return; }
    } else {
      res = await api.deleteIncident(deleteConfirm.id);
      if (res.status === 'ok') { showToast('Incident deleted', 'success'); load(); }
    }
    setSaving(false);
    setDeleteConfirm(null);
    if (res?.status !== 'ok') showToast('Error: ' + res?.message, 'error');
  }

  function showToast(msg: string, type = '') {
    setToast(msg + (type === 'error' ? '' : ''));
    setTimeout(() => setToast(''), 4000);
  }

  const incidentDoses = activeIncident ? doses.filter(d => d.incident_id === activeIncident.incident_id) : [];
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-PH', { month:'long', day:'numeric', year:'numeric' }) : '—';
  const getUserName = (id: string) => {
    if (!id) return '—';
    const u = allUsers[id];
    return u ? `${u.full_name}${u.credential ? `, ${u.credential}` : ''}` : id;
  };

  // Pet monitor for active incident
  const activeMonitor = activeIncident ? monitors.find(m => m.incident_id === activeIncident.incident_id) : null;
  const monitorEnd = activeMonitor ? new Date(activeMonitor.monitor_end) : null;
  const today = new Date();
  const monitorReady = monitorEnd ? today >= monitorEnd : false;

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
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/patients/${patient_id}/print`)}>🖨 Print Form</button>
          <button className="btn btn-primary" onClick={() => router.push(`/patients/${patient_id}/incident/new`)}>+ New Incident</button>
          {user?.role === 'admin' && (
            <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm({ type:'patient', id: patient_id })}>🗑 Delete Patient</button>
          )}
        </div>
      </div>

      <div className="page-body">
        <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:18 }}>

          {/* Left col */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title">Patient Information</span>
                {(user?.role === 'nurse' || user?.role === 'admin' || user?.role === 'doctor') && (
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => setEditPatientOpen(true)}>
                    ✏️ Update
                  </button>
                )}
              </div>
              <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:9 }}>
                {[
                  { label:'Patient ID',    val: patient.patient_id, mono: true },
                  { label:'Full Name',     val: patient.full_name },
                  { label:'Sex',           val: patient.sex === 'M' ? '♂ Male' : patient.sex === 'F' ? '♀ Female' : '—' },
                  { label:'Age',           val: patient.age ? `${patient.age} yrs` : '—' },
                  { label:'Date of Birth', val: formatDate(patient.date_of_birth) },
                  { label:'Weight',        val: patient.weight ? `${patient.weight} kg` : '—' },
                  { label:'Height',        val: (patient as any).height ? `${(patient as any).height} cm` : '—' },
                  { label:'Address',       val: patient.address || '—' },
                  { label:'Contact',       val: patient.contact_no || '—' },
                ].map(row => (
                  <div key={row.label} style={{ display:'flex', justifyContent:'space-between', fontSize:13, gap:8, paddingBottom:7, borderBottom:'1px solid #f1f5f9' }}>
                    <span style={{ color:'var(--slate-400)', flexShrink:0, fontSize:12 }}>{row.label}</span>
                    <span style={{ fontWeight:500, textAlign:'right', fontFamily:(row as any).mono ? 'monospace' : undefined, color:(row as any).mono ? 'var(--blue-700)' : undefined, fontSize:13 }}>
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
                  <span className={`badge ${activeMonitor.outcome === 'perished' ? 'badge-overdue' : activeMonitor.outcome === 'healthy' ? 'badge-done' : 'badge-scheduled'}`}>
                    {activeMonitor.outcome}
                  </span>
                </div>
                <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                    <span style={{ color:'var(--slate-500)' }}>Start</span>
                    <span>{formatDate(activeMonitor.monitor_start)}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                    <span style={{ color:'var(--slate-500)' }}>End</span>
                    <span style={{ fontWeight:600 }}>{formatDate(activeMonitor.monitor_end)}</span>
                  </div>
                  {activeMonitor.outcome === 'unknown' && !monitorReady && (
                    <div className="alert alert-blue" style={{ fontSize:12, marginBottom:0 }}>
                      ⏳ Monitoring period ends {formatDate(activeMonitor.monitor_end)}
                    </div>
                  )}
                  {activeMonitor.outcome === 'unknown' && monitorReady && (user?.role === 'nurse' || user?.role === 'admin') && (
                    <button className="btn btn-primary btn-sm" style={{ marginTop:4 }}
                      onClick={() => { setPetOutcomeModal(activeMonitor); setPetOutcome('healthy'); }}>
                      Record Pet Outcome
                    </button>
                  )}
                  {activeMonitor.outcome !== 'unknown' && (
                    <div style={{ fontSize:12, color:'var(--slate-500)' }}>
                      Recorded: {formatDate(activeMonitor.outcome_date)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right col */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Incidents */}
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
                      Incident #{i+1} — {inc.consult_date ? new Date(inc.consult_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : ''}
                      {inc.wound_category && <span className={`badge badge-cat${inc.wound_category === 'I' ? '1' : inc.wound_category === 'II' ? '2' : '3'}`} style={{ marginLeft:6 }}>Cat {inc.wound_category}</span>}
                    </button>
                  ))}
                </div>

                {activeIncident && (
                  <div className="card-body">
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
                      <div>
                        <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--slate-400)', fontWeight:700, marginBottom:8 }}>Exposure Detail</div>
                        {[
                          { l:'Date of Bite', v: activeIncident.bite_datetime ? new Date(activeIncident.bite_datetime).toLocaleString('en-PH') : '—' },
                          { l:'Animal', v: activeIncident.animal_type ? (activeIncident.animal_type.charAt(0).toUpperCase()+activeIncident.animal_type.slice(1)) + (activeIncident.animal_other ? ` (${activeIncident.animal_other})` : '') : '—' },
                          { l:'Ownership', v: activeIncident.ownership?.replace(/_/g,' ') || '—' },
                          { l:'Circumstance', v: activeIncident.circumstance || '—' },
                          { l:'Place', v: activeIncident.place_of_exposure || '—' },
                        ].map(r => (
                          <div key={r.l} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0', borderBottom:'1px solid #f8fafc' }}>
                            <span style={{ color:'var(--slate-400)' }}>{r.l}</span>
                            <span style={{ fontWeight:500, textTransform:'capitalize', textAlign:'right', maxWidth:160 }}>{r.v}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--slate-400)', fontWeight:700, marginBottom:8 }}>Wound & Treatment</div>
                        {[
                          { l:'Category', v: activeIncident.wound_category ? `Category ${activeIncident.wound_category}` : '—' },
                          { l:'Wound Status', v: activeIncident.wound_status?.replace(/_/g,' ') || '—' },
                          { l:'ERIG/HRIG', v: activeIncident.erig_hrig || 'None' },
                          { l:'Tetanus', v: activeIncident.tetanus_vaccine_status === 'Y' ? `Yes (${activeIncident.tetanus_date || 'date not set'})` : activeIncident.tetanus_vaccine_status === 'N' ? `No → ${activeIncident.tetanus_type || '?'}` : '—' },
                          { l:'Assessed by', v: getUserName(activeIncident.referring_doctor) },
                          { l:'Status', v: activeIncident.status },
                        ].map(r => (
                          <div key={r.l} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0', borderBottom:'1px solid #f8fafc' }}>
                            <span style={{ color:'var(--slate-400)' }}>{r.l}</span>
                            <span style={{ fontWeight:500, textTransform:'capitalize', textAlign:'right', maxWidth:160 }}>{r.v}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {activeIncident.anatomical_positions && (
                      <div style={{ marginBottom:14 }}>
                        <BodyDiagram selected={(() => { try { return JSON.parse(activeIncident.anatomical_positions); } catch { return []; }})() } />
                      </div>
                    )}

                    {activeIncident.physician_notes && (
                      <div style={{ background:'var(--blue-50)', border:'1px solid var(--blue-200)', borderRadius:'var(--radius-md)', padding:'10px 12px', fontSize:13, marginBottom:12 }}>
                        <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--blue-600)', fontWeight:700, marginBottom:5 }}>Physician Notes</div>
                        {activeIncident.physician_notes}
                      </div>
                    )}

                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {(user?.role === 'doctor' || user?.role === 'admin') && (
                        <button className="btn btn-secondary btn-sm"
                          onClick={() => router.push(`/patients/${patient_id}/incident/${activeIncident.incident_id}/edit`)}>
                          ✏️ Update Clinical Data
                        </button>
                      )}
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => router.push(`/patients/${patient_id}/print`)}>
                        🖨 Print Form
                      </button>
                      {user?.role === 'admin' && (
                        <button className="btn btn-danger btn-sm"
                          onClick={() => setDeleteConfirm({ type:'incident', id: activeIncident.incident_id })}>
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
                  <div className="empty-sub">Add the first bite incident for this patient</div>
                </div>
              </div>
            )}

            {/* Dose schedule */}
            {activeIncident && incidentDoses.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">💉 Vaccine Schedule</span>
                  <span style={{ fontSize:12, color:'var(--slate-500)' }}>
                    {incidentDoses.filter(d => d.status === 'done').length} / {incidentDoses.filter(d => !d.is_optional).length} required doses given
                  </span>
                </div>
                <DoseTable doses={incidentDoses} allUsers={allUsers} onAdminister={d => {
                  setAdminModal(d);
                  setDoseForm({ vaccine_type:'PVRV', brand_name:'', batch_no:'' });
                }} userRole={user?.role || ''} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit patient info modal — for incident 2+ */}
      {editPatientOpen && patient && (
        <div className="modal-overlay" onClick={() => setEditPatientOpen(false)}>
          <div className="modal" style={{ maxWidth:460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Update Patient Information</h2>
              <button className="btn btn-ghost btn-icon" style={{ color:'white' }} onClick={() => setEditPatientOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize:13, color:'var(--slate-500)', marginBottom:16 }}>
                Update contact details for <strong>{patient.full_name}</strong>. Leave blank to keep current value.
              </p>
              <div className="form-grid">
                <div className="form-grid-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="form-group">
                    <label className="form-label">Weight (kg) <span style={{ fontWeight:400, color:'var(--slate-400)' }}>now: {patient.weight || '—'}</span></label>
                    <input className="form-input" type="number" step="0.1" min="0"
                      value={editPatientForm.weight}
                      onChange={e => setEditPatientForm(p => ({...p, weight: e.target.value}))}
                      placeholder={String(patient.weight || '')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Height (cm) <span style={{ fontWeight:400, color:'var(--slate-400)' }}>now: {(patient as any).height || '—'}</span></label>
                    <input className="form-input" type="number" step="0.5" min="0"
                      value={(editPatientForm as any).height || ''}
                      onChange={e => setEditPatientForm(p => ({...p, height: e.target.value} as any))}
                      placeholder={String((patient as any).height || '')} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Contact No. <span style={{ fontWeight:400, color:'var(--slate-400)' }}>now: {patient.contact_no || '—'}</span></label>
                  <input className="form-input" type="tel"
                    value={editPatientForm.contact_no}
                    onChange={e => setEditPatientForm(p => ({...p, contact_no: e.target.value}))}
                    placeholder={patient.contact_no || '09XX-XXX-XXXX'} />
                </div>
                <div className="form-group">
                  <label className="form-label">Address <span style={{ fontWeight:400, color:'var(--slate-400)' }}>now: {patient.address || '—'}</span></label>
                  <input className="form-input" type="text"
                    value={editPatientForm.address}
                    onChange={e => setEditPatientForm(p => ({...p, address: e.target.value}))}
                    placeholder={patient.address || 'Barangay, Municipality…'} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditPatientOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={savePatientInfo} disabled={saving}>
                {saving ? <><span className="spinner" /> Saving…</> : '✓ Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Administer dose modal */}
      {adminModal && (
        <div className="modal-overlay" onClick={() => setAdminModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Administer Dose — {adminModal.dose_day}</h2>
              <button className="btn btn-ghost btn-icon" style={{ color:'white' }} onClick={() => setAdminModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background:'var(--blue-50)', borderRadius:'var(--radius-md)', padding:'10px 14px', marginBottom:16, fontSize:13, color:'var(--blue-700)' }}>
                Scheduled: <strong>{adminModal.scheduled_date}</strong> · Day: <strong>{adminModal.dose_day}</strong>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Vaccine Type *</label>
                  <div className="checkbox-group">
                    {['PVRV','PCEC'].map(v => (
                      <label key={v} className="checkbox-item">
                        <input type="radio" name="vtype" value={v}
                          checked={doseForm.vaccine_type === v}
                          onChange={() => setDoseForm(p => ({...p, vaccine_type: v}))} />
                        {v}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Brand Name</label>
                  <input className="form-input" type="text" value={doseForm.brand_name}
                    onChange={e => setDoseForm(p => ({...p, brand_name: e.target.value}))}
                    placeholder="e.g. Verorab, Rabipur…" />
                </div>
                <div className="form-group">
                  <label className="form-label">Batch / Lot Number</label>
                  <input className="form-input" type="text" value={doseForm.batch_no}
                    onChange={e => setDoseForm(p => ({...p, batch_no: e.target.value}))}
                    placeholder="Batch No." />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAdminModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitDose} disabled={saving}>
                {saving ? <><span className="spinner" /> Saving…</> : '✓ Record Dose'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pet outcome modal */}
      {petOutcomeModal && (
        <div className="modal-overlay" onClick={() => setPetOutcomeModal(null)}>
          <div className="modal" style={{ maxWidth:440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">🐾 Record Pet Outcome</h2>
              <button className="btn btn-ghost btn-icon" style={{ color:'white' }} onClick={() => setPetOutcomeModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize:14, color:'var(--slate-600)', marginBottom:16 }}>
                The 14-day monitoring period has ended. What is the condition of the patient's pet?
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <label style={{ display:'flex', gap:12, padding:'12px 16px', borderRadius:'var(--radius-md)', border:'2px solid', borderColor: petOutcome === 'healthy' ? 'var(--blue-500)' : 'var(--slate-200)', background: petOutcome === 'healthy' ? 'var(--blue-50)' : 'white', cursor:'pointer', transition:'all .12s' }}>
                  <input type="radio" name="pet_out" checked={petOutcome === 'healthy'} onChange={() => setPetOutcome('healthy')} style={{ accentColor:'var(--blue-600)', marginTop:2 }} />
                  <div>
                    <div style={{ fontWeight:700, color:'var(--green-700)' }}>✅ Pet is Healthy / Alive</div>
                    <div style={{ fontSize:12, color:'var(--slate-500)', marginTop:2 }}>Doctor may consider discontinuing treatment</div>
                  </div>
                </label>
                <label style={{ display:'flex', gap:12, padding:'12px 16px', borderRadius:'var(--radius-md)', border:'2px solid', borderColor: petOutcome === 'perished' ? 'var(--red-500)' : 'var(--slate-200)', background: petOutcome === 'perished' ? '#fff5f5' : 'white', cursor:'pointer', transition:'all .12s' }}>
                  <input type="radio" name="pet_out" checked={petOutcome === 'perished'} onChange={() => setPetOutcome('perished')} style={{ accentColor:'var(--red-600)', marginTop:2 }} />
                  <div>
                    <div style={{ fontWeight:700, color:'var(--red-700)' }}>⚠️ Pet Perished / Died</div>
                    <div style={{ fontSize:12, color:'var(--slate-500)', marginTop:2 }}>Continue full anti-rabies treatment immediately</div>
                  </div>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPetOutcomeModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitPetOutcome} disabled={saving}>
                {saving ? <><span className="spinner" /> Saving…</> : '✓ Record Outcome'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
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
                  : 'Delete this incident and all related dose schedules? This cannot be undone.'}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                {saving ? <><span className="spinner" /> Deleting…</> : '🗑 Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.includes('Error') ? 'error' : 'success'}`}>{toast}</div>
        </div>
      )}
    </div>
  );
}
