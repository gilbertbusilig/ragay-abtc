'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function formatPhilippineContact(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

function getLocalISODate() {
  const now = new Date();
  const tzOffsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffsetMs).toISOString().split('T')[0];
}

export default function NewIncidentPage() {
  const { user, activeNurse } = useAuth();
  const router = useRouter();
  const params = useParams();
  const patient_id = params.id as string;
  const today = getLocalISODate();
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [patientForm, setPatientForm] = useState({ weight: '', address: '', contact_no: '' });

  const [form, setForm] = useState({
    bite_datetime: '',
    place_of_exposure: '',
    animal_type: 'dog',
    animal_other: '',
    ownership: '',
    pet_vaccine_date: '',
    circumstance: '',
    dose_type: 'PEP',
    pep_doses_needed: 5,
    d0_date: '',
  });

  const set = (k: string, v: string | number) => setForm(prev => ({ ...prev, [k]: v }));

  useEffect(() => {
    api.getPatient(patient_id).then(res => {
      if (res.status === 'ok' && res.data?.patient) {
        const patient = res.data.patient;
        setPatientForm({
          weight: String(patient.weight || ''),
          address: patient.address || '',
          contact_no: patient.contact_no || '',
        });
      }
    });
  }, [patient_id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const creator = user?.role === 'nurse' && activeNurse ? activeNurse.user_id : user?.user_id;
    const patientUpdateRes = await api.updatePatient({
      patient_id,
      weight: patientForm.weight,
      address: patientForm.address,
      contact_no: patientForm.contact_no,
      updated_by: creator,
    });
    if (patientUpdateRes.status !== 'ok') {
      setSaving(false);
      setToast('Error: ' + (patientUpdateRes.message || 'Failed to update patient info'));
      return;
    }
    const res = await api.createIncident({
      patient_id,
      ...form,
      consult_date: form.d0_date || today,
      created_by: creator,
    });
    setSaving(false);
    if (res.status === 'ok') {
      router.push(`/patients/${patient_id}`);
    } else {
      setToast('Error: ' + (res.message || 'Failed'));
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/patients/${patient_id}`)} style={{ marginBottom:8 }}>← Back to Patient</button>
          <h1 className="page-title">New Bite Incident</h1>
          <p className="page-subtitle">Recording a new exposure for an existing patient</p>
        </div>
      </div>

      <div className="page-body">
        <form onSubmit={handleSubmit}>
          <div className="section-box">
            <div className="section-box-title">Patient Details To Update</div>
            <div className="form-grid form-grid-3">
              <div className="form-group">
                <label className="form-label">Weight (kg)</label>
                <input className="form-input" type="number" min="0" step="0.1" value={patientForm.weight} onChange={e => setPatientForm(prev => ({ ...prev, weight: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact No.</label>
                <input className="form-input" type="tel" inputMode="numeric" maxLength={13} value={patientForm.contact_no} onChange={e => setPatientForm(prev => ({ ...prev, contact_no: formatPhilippineContact(e.target.value) }))} placeholder="09XX XXX XXXX" />
              </div>
              <div className="form-group" style={{ gridColumn:'1 / -1' }}>
                <label className="form-label">Address</label>
                <input className="form-input" type="text" value={patientForm.address} onChange={e => setPatientForm(prev => ({ ...prev, address: e.target.value }))} placeholder="Barangay, Municipality, Province" />
              </div>
            </div>
          </div>

          <div style={{ background:'var(--amber-50, #fffbeb)', border:'1px solid #fcd34d', borderRadius:'var(--radius-md)', padding:'10px 16px', marginBottom:20, fontSize:14, color:'#92400e' }}>
            <strong>📋 Note:</strong> This creates a new incident record for the patient. Wound description and treatment data (Sections III–VII) can be added by the doctor after saving.
          </div>

          <div className="section-box">
            <div className="section-box-title">II. Detail of Incidence / Exposure</div>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Date / Time of Bite</label>
                <input className="form-input" type="datetime-local" value={form.bite_datetime} onChange={e => set('bite_datetime', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Place of Exposure</label>
                <input className="form-input" type="text" value={form.place_of_exposure} onChange={e => set('place_of_exposure', e.target.value)} placeholder="e.g. Home, Road, Farm…" />
              </div>
              <div>
                <div className="form-group" style={{ marginBottom:14 }}>
                  <label className="form-label">Type of Exposure</label>
                  <div className="checkbox-group">
                    {['dog','cat','bat','other'].map(a => (
                      <label key={a} className="checkbox-item">
                        <input type="radio" name="animal" value={a} checked={form.animal_type===a} onChange={() => set('animal_type', a)} />
                        {a.charAt(0).toUpperCase()+a.slice(1)}
                      </label>
                    ))}
                  </div>
                  {form.animal_type === 'other' && (
                    <input className="form-input" style={{ marginTop:8 }} type="text" value={form.animal_other} onChange={e => set('animal_other', e.target.value)} placeholder="Specify animal…" />
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Circumstance</label>
                  <div className="checkbox-group">
                    {['provoked','unprovoked'].map(c => (
                      <label key={c} className="checkbox-item">
                        <input type="radio" name="circumstance" value={c} checked={form.circumstance===c} onChange={() => set('circumstance', c)} />
                        {c.charAt(0).toUpperCase()+c.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Ownership</label>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    { val:'owned_vaccinated', label:'Owned / Vaccinated' },
                    { val:'owned_not_vaccinated', label:'Owned / Not Vaccinated' },
                    { val:'stray', label:'Stray' },
                    { val:'wild_rabid', label:'Wild / Rabid' },
                  ].map(o => (
                    <label key={o.val} className="checkbox-item">
                      <input type="radio" name="ownership" value={o.val} checked={form.ownership===o.val} onChange={() => set('ownership', o.val)} />
                      {o.label}
                    </label>
                  ))}
                  {form.ownership === 'owned_vaccinated' && (
                    <div className="form-group" style={{ marginTop:4 }}>
                      <label className="form-label">Pet Vaccine Date</label>
                      <input className="form-input" type="date" value={form.pet_vaccine_date} onChange={e => set('pet_vaccine_date', e.target.value)} max={today} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="section-box">
            <div className="section-box-title">Treatment Plan</div>
            <div className="form-group">
              <label className="form-label">PEP / PrEP Doses Required</label>
              <select
                className="form-select"
                value={`${form.dose_type}:${form.pep_doses_needed}`}
                onChange={e => {
                  const [doseType, doseCount] = e.target.value.split(':');
                  setForm(prev => ({
                    ...prev,
                    dose_type: doseType,
                    pep_doses_needed: Number(doseCount),
                  }));
                }}
                style={{ maxWidth: 420 }}
              >
                <option value="PEP:5">PEP - 5 doses (D0, D3, D7, D14, D28/30)</option>
                <option value="PEP:4">PEP - 4 doses (D0, D3, D7, D28/30)</option>
                <option value="PrEP:3">PrEP - 3 doses (D0, D7, D21/28)</option>
                <option value="PEP:1">Booster - 1 dose (D0)</option>
              </select>
              <div style={{ fontSize:12, color:'var(--slate-500)', marginTop:8 }}>
                Schedule dates stay blank until the actual date given for D0 is recorded.
              </div>
            </div>
          </div>

          <div style={{ display:'flex', gap:12, justifyContent:'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => router.push(`/patients/${patient_id}`)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner" style={{ width:16, height:16 }} /> Saving…</> : '✓ Save Incident'}
            </button>
          </div>
        </form>
      </div>

      {toast && (
        <div className="toast-container">
          <div className="toast error">{toast}</div>
        </div>
      )}
    </div>
  );
}
