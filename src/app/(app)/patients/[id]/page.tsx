'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Patient, Incident, Dose, PetMonitor } from '@/types';
import { useAuth } from '@/lib/auth';

const BODY_SITES = ['Head','Neck','R.Arm','L.Arm','R.Hand','L.Hand','Chest','Abdomen','R.Leg','L.Leg','R.Foot','L.Foot','Back'];

function BodyDiagram({ selected, onChange }: { selected: string[]; onChange?: (sites: string[]) => void }) {
  const toggle = (site: string) => {
    if (!onChange) return;
    onChange(selected.includes(site) ? selected.filter(s => s !== site) : [...selected, site]);
  };
  return (
    <div>
      <div style={{ fontSize:11, color:'var(--slate-500)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.06em' }}>Anatomical Position</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
        {BODY_SITES.map(site => (
          <button key={site} type="button"
            onClick={() => toggle(site)}
            style={{
              padding:'4px 10px',
              borderRadius:20,
              fontSize:12,
              border: '1.5px solid',
              borderColor: selected.includes(site) ? 'var(--red-500)' : 'var(--slate-200)',
              background: selected.includes(site) ? 'var(--red-50)' : 'white',
              color: selected.includes(site) ? 'var(--red-700)' : 'var(--slate-500)',
              cursor: onChange ? 'pointer' : 'default',
              fontWeight: selected.includes(site) ? 600 : 400,
              transition:'all .15s',
            }}
          >
            {site}
          </button>
        ))}
      </div>
    </div>
  );
}

function DoseTable({ doses, onAdminister, userRole }: { doses: Dose[]; onAdminister: (dose: Dose) => void; userRole: string }) {
  const statusBadge = (s: string, optional: boolean) => {
    if (optional && s === 'scheduled') return <span className="badge" style={{ background:'#f8fafc', color:'var(--slate-400)', border:'1px solid var(--slate-200)' }}>Optional</span>;
    const map: Record<string, string> = { done:'badge-done', scheduled:'badge-scheduled', overdue:'badge-overdue', skipped:'badge-scheduled' };
    return <span className={`badge ${map[s] || ''}`}>{s}</span>;
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
            <tr key={d.dose_id} style={{ opacity: d.is_optional && d.status === 'scheduled' ? .6 : 1 }}>
              <td><span style={{ fontWeight:700, color:'var(--teal-700)' }}>{d.dose_day}</span></td>
              <td style={{ fontSize:13 }}>{d.scheduled_date}</td>
              <td>{statusBadge(d.status, d.is_optional)}</td>
              <td style={{ fontSize:13 }}>{d.vaccine_type || '—'}</td>
              <td style={{ fontSize:13 }}>{d.brand_name || '—'}</td>
              <td style={{ fontSize:13 }}>{d.batch_no || '—'}</td>
              <td style={{ fontSize:13 }}>{d.administered_by || '—'}</td>
              <td style={{ fontSize:13 }}>{d.administered_date || '—'}</td>
              {(userRole === 'nurse' || userRole === 'admin') && (
                <td>
                  {d.status !== 'done' && (
                    <button className="btn btn-primary btn-sm" onClick={() => onAdminister(d)}>
                      Administer
                    </button>
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
  const [loading, setLoading] = useState(true);
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  const [adminModal, setAdminModal] = useState<Dose | null>(null);
  const [doseForm, setDoseForm] = useState({ vaccine_type: 'PVRV', brand_name: '', batch_no: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { load(); }, [patient_id]);

  async function load() {
    setLoading(true);
    const res = await api.getPatient(patient_id);
    if (res.status === 'ok') {
      setPatient(res.data.patient);
      setIncidents(res.data.incidents || []);
      setDoses(res.data.doses || []);
      setMonitors(res.data.monitors || []);
      if (res.data.incidents?.length > 0) setActiveIncident(res.data.incidents[res.data.incidents.length - 1]);
    }
    setLoading(false);
  }

  async function submitDose() {
    if (!adminModal) return;
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

  function showToast(msg: string, type = '') {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  const incidentDoses = activeIncident ? doses.filter(d => d.incident_id === activeIncident.incident_id) : [];

  if (loading) return <div className="page-loader"><div className="spinner" style={{ width:28, height:28 }} /></div>;
  if (!patient) return <div className="page-body"><div className="card"><div className="empty-state"><div className="empty-text">Patient not found</div></div></div></div>;

  const age = patient.age;
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' }) : '—';

  return (
    <div>
      <div className="page-header no-print">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => router.push('/patients')} style={{ marginBottom:8 }}>← Patient Records</button>
          <h1 className="page-title">{patient.full_name}</h1>
          <p className="page-subtitle" style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontFamily:'monospace', color:'var(--teal-700)', fontWeight:600 }}>{patient.patient_id}</span>
            <span className={`badge badge-${patient.status}`}>{patient.status}</span>
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/patients/${patient_id}/print`)}>🖨 Print Form</button>
          <button className="btn btn-primary" onClick={() => router.push(`/patients/${patient_id}/incident/new`)}>+ New Incident</button>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:20 }}>

          {/* Left: Patient info */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div className="card">
              <div className="card-header"><span className="card-title">Patient Information</span></div>
              <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  { label:'Patient ID', val: patient.patient_id, mono: true },
                  { label:'Full Name', val: patient.full_name },
                  { label:'Sex', val: patient.sex === 'M' ? '♂ Male' : patient.sex === 'F' ? '♀ Female' : '—' },
                  { label:'Age', val: age ? `${age} years old` : '—' },
                  { label:'Date of Birth', val: formatDate(patient.date_of_birth) },
                  { label:'Weight', val: patient.weight ? `${patient.weight} kg` : '—' },
                  { label:'Address', val: patient.address || '—' },
                  { label:'Contact', val: patient.contact_no || '—' },
                ].map(row => (
                  <div key={row.label} style={{ display:'flex', justifyContent:'space-between', fontSize:14, gap:8 }}>
                    <span style={{ color:'var(--slate-500)', flexShrink:0 }}>{row.label}</span>
                    <span style={{ fontWeight:500, textAlign:'right', fontFamily: (row as any).mono ? 'monospace' : undefined, color: (row as any).mono ? 'var(--teal-700)' : undefined }}>
                      {row.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pet monitors */}
            {monitors.length > 0 && (
              <div className="card">
                <div className="card-header"><span className="card-title">🐾 Pet Monitor</span></div>
                <div className="card-body">
                  {monitors.map(m => (
                    <div key={m.monitor_id} style={{ fontSize:13, display:'flex', flexDirection:'column', gap:6 }}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ color:'var(--slate-500)' }}>Period</span>
                        <span>{formatDate(m.monitor_start)} – {formatDate(m.monitor_end)}</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ color:'var(--slate-500)' }}>Outcome</span>
                        <span style={{ fontWeight:600, color: m.outcome === 'perished' ? 'var(--red-600)' : m.outcome === 'healthy' ? 'var(--green-600)' : 'var(--amber-500)' }}>
                          {m.outcome}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: incidents + doses */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Incident tabs */}
            {incidents.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Bite Incidents ({incidents.length})</span>
                </div>
                <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--slate-100)', display:'flex', gap:8, flexWrap:'wrap' }}>
                  {incidents.map((inc, i) => (
                    <button key={inc.incident_id}
                      className={`btn btn-sm ${activeIncident?.incident_id === inc.incident_id ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setActiveIncident(inc)}>
                      Incident #{i+1} — {formatDate(inc.consult_date)}
                      {inc.wound_category && <span className={`badge badge-cat${inc.wound_category === 'I' ? '1' : inc.wound_category === 'II' ? '2' : '3'}`} style={{ marginLeft:6 }}>Cat {inc.wound_category}</span>}
                    </button>
                  ))}
                </div>

                {activeIncident && (
                  <div className="card-body">
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
                      <div>
                        <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--slate-400)', marginBottom:6 }}>Exposure Detail</div>
                        {[
                          { l:'Date of Bite', v: activeIncident.bite_datetime ? new Date(activeIncident.bite_datetime).toLocaleString('en-PH') : '—' },
                          { l:'Animal', v: activeIncident.animal_type + (activeIncident.animal_other ? ` (${activeIncident.animal_other})` : '') },
                          { l:'Ownership', v: activeIncident.ownership?.replace(/_/g,' ') || '—' },
                          { l:'Circumstance', v: activeIncident.circumstance || '—' },
                          { l:'Place', v: activeIncident.place_of_exposure || '—' },
                        ].map(r => (
                          <div key={r.l} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'4px 0', borderBottom:'1px solid var(--slate-50)' }}>
                            <span style={{ color:'var(--slate-500)' }}>{r.l}</span>
                            <span style={{ fontWeight:500, textTransform:'capitalize' }}>{r.v}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--slate-400)', marginBottom:6 }}>Wound / Treatment</div>
                        {[
                          { l:'Category', v: activeIncident.wound_category ? `Category ${activeIncident.wound_category}` : '—' },
                          { l:'Wound Status', v: activeIncident.wound_status?.replace(/_/g,' ') || '—' },
                          { l:'ERIG/HRIG', v: activeIncident.erig_hrig || 'None' },
                          { l:'Tetanus', v: activeIncident.tetanus_vaccine_status === 'Y' ? `Yes (${activeIncident.tetanus_date || ''})` : activeIncident.tetanus_vaccine_status === 'N' ? `No → ${activeIncident.tetanus_type || '?'}` : '—' },
                          { l:'Status', v: activeIncident.status },
                        ].map(r => (
                          <div key={r.l} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'4px 0', borderBottom:'1px solid var(--slate-50)' }}>
                            <span style={{ color:'var(--slate-500)' }}>{r.l}</span>
                            <span style={{ fontWeight:500, textTransform:'capitalize' }}>{r.v}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {activeIncident.anatomical_positions && (
                      <div style={{ marginBottom:16 }}>
                        <BodyDiagram selected={(() => { try { return JSON.parse(activeIncident.anatomical_positions); } catch { return []; }})() } />
                      </div>
                    )}

                    {activeIncident.physician_notes && (
                      <div style={{ background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:'var(--radius-md)', padding:'12px 14px', fontSize:14 }}>
                        <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--slate-400)', marginBottom:6 }}>Physician Notes</div>
                        {activeIncident.physician_notes}
                      </div>
                    )}

                    {(user?.role === 'doctor' || user?.role === 'admin') && (
                      <div style={{ marginTop:12 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/patients/${patient_id}/incident/${activeIncident.incident_id}/edit`)}>
                          ✏️ Update Clinical Data
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {incidents.length === 0 && (
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
                  <span style={{ fontSize:13, color:'var(--slate-500)' }}>
                    {incidentDoses.filter(d => d.status === 'done').length} / {incidentDoses.filter(d => !d.is_optional).length} doses given
                  </span>
                </div>
                <DoseTable doses={incidentDoses} onAdminister={d => { setAdminModal(d); setDoseForm({ vaccine_type:'PVRV', brand_name:'', batch_no:'' }); }} userRole={user?.role || ''} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Administer dose modal */}
      {adminModal && (
        <div className="modal-overlay" onClick={() => setAdminModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Administer Dose — {adminModal.dose_day}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setAdminModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background:'var(--slate-50)', borderRadius:'var(--radius-md)', padding:'12px 14px', marginBottom:18, fontSize:13, color:'var(--slate-600)' }}>
                Scheduled: <strong>{adminModal.scheduled_date}</strong> · Day: <strong>{adminModal.dose_day}</strong>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Vaccine Type <span style={{color:'var(--red-500)'}}>*</span></label>
                  <div className="checkbox-group">
                    {['PVRV','PCEC'].map(v => (
                      <label key={v} className="checkbox-item">
                        <input type="radio" name="vaccine_type" value={v} checked={doseForm.vaccine_type === v} onChange={() => setDoseForm(p => ({...p, vaccine_type: v}))} />
                        {v}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Brand Name</label>
                  <input className="form-input" type="text" value={doseForm.brand_name} onChange={e => setDoseForm(p => ({...p, brand_name: e.target.value}))} placeholder="e.g. Verorab, Rabipur…" />
                </div>
                <div className="form-group">
                  <label className="form-label">Batch Number</label>
                  <input className="form-input" type="text" value={doseForm.batch_no} onChange={e => setDoseForm(p => ({...p, batch_no: e.target.value}))} placeholder="Lot / Batch No." />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAdminModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitDose} disabled={saving}>
                {saving ? <><span className="spinner" style={{ width:16, height:16 }} /> Saving…</> : '✓ Record Dose'}
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
