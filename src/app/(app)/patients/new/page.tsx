'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function calculateAge(dateOfBirth: string) {
  if (!dateOfBirth) return '';
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return '';
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const hasNotHadBirthday =
    now.getMonth() < dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (hasNotHadBirthday) years -= 1;
  return String(Math.max(years, 0));
}

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

export default function NewPatientPage() {
  const { user, activeNurse } = useAuth();
  const router = useRouter();
  const today = getLocalISODate();
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [saveMode, setSaveMode] = useState<'record' | 'edit'>('record');

  // Section I
  const [form, setForm] = useState({
    full_name: '', address: '', date_of_birth: '', sex: '', age: '', weight: '', contact_no: '', consult_date: today,
    // Section II
    bite_datetime: '', place_of_exposure: '',
    animal_type: 'dog', animal_other: '',
    ownership: '', pet_vaccine_date: '',
    circumstance: '',
  });

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name) return;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const mode = submitter?.dataset.mode === 'edit' ? 'edit' : 'record';
    setSaveMode(mode);
    setSaving(true);

    const creator = user?.role === 'nurse' && activeNurse ? activeNurse.user_id : user?.user_id;

    // 1. Create patient
    const patRes = await api.createPatient({
      full_name: form.full_name,
      address: form.address,
      date_of_birth: form.date_of_birth,
      sex: form.sex,
      age: form.age,
      weight: form.weight,
      contact_no: form.contact_no,
      created_by: creator,
    });

    if (patRes.status !== 'ok') {
      setSaving(false);
      setToast('Error: ' + (patRes.message || 'Failed to create patient'));
      return;
    }

    const patient_id = patRes.data?.patient_id;

    // Safety check: ensure we received a valid patient_id before proceeding
    if (!patient_id) {
      setSaving(false);
      setToast('Error: Could not retrieve new patient ID. Please check patient records.');
      return;
    }

    // 2. Create incident
    const incRes = await api.createIncident({
      patient_id,
      consult_date: form.consult_date || today,
      d0_date: '',
      bite_datetime: form.bite_datetime,
      place_of_exposure: form.place_of_exposure,
      animal_type: form.animal_type,
      animal_other: form.animal_other,
      ownership: form.ownership,
      pet_vaccine_date: form.pet_vaccine_date,
      circumstance: form.circumstance,
      pep_doses_needed: 5,
      created_by: creator,
    });

    setSaving(false);

    if (incRes.status === 'ok') {
      const incident_id = incRes.data?.incident_id;
      // Use window.location for a hard navigate to ensure fresh data load with no stale cache
      window.location.href = mode === 'edit' && incident_id
        ? `/patients/${patient_id}/incident/${incident_id}/edit`
        : `/patients/${patient_id}`;
    } else {
      setToast('Patient saved but incident setup failed: ' + (incRes.message || 'Unknown error') + '. You can add the incident from the patient record.');
      setTimeout(() => { window.location.href = `/patients/${patient_id}`; }, 3000);
    }
  }
  const genId = `${new Date().getFullYear()}-00000`;

  return (
    <div>
      <div className="page-header no-print">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => router.back()} style={{ marginBottom:8 }}>← Back</button>
          <h1 className="page-title">New Patient Consultation</h1>
        </div>
      </div>

      <div className="page-body">
        <form onSubmit={handleSubmit}>
          {/* Meta */}
          <div style={{ display:'flex', gap:16, marginBottom:20, flexWrap:'wrap' }}>
            <div className="form-group" style={{ flex:1 }}>
              <label className="form-label">Date of Consultation</label>
              <input className="form-input" type="date" value={form.consult_date} onChange={e => set('consult_date', e.target.value)} max={today} />
            </div>
            <div className="form-group" style={{ flex:1 }}>
              <label className="form-label">Patient ID No.</label>
              <input className="form-input" type="text" value={genId} readOnly style={{ background:'var(--slate-50)', fontFamily:'monospace', color:'var(--slate-500)' }} />
            </div>
          </div>

          {/* Section I */}
          <div className="section-box">
            <div className="section-box-title">I. Patient Information</div>
            <div className="form-grid form-grid-3" style={{ marginBottom:12 }}>
              <div className="form-group" style={{ gridColumn:'1 / -1' }}>
                <label className="form-label">A. Patient's Full Name <span style={{color:'var(--red-500)'}}>*</span></label>
                <input className="form-input" type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)} required placeholder="Last, First Middle" />
              </div>
              <div className="form-group" style={{ gridColumn:'1 / -1' }}>
                <label className="form-label">B. Address</label>
                <input className="form-input" type="text" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Barangay, Municipality, Province" />
              </div>
              <div className="form-group">
                <label className="form-label">C. Date of Birth</label>
                <input className="form-input" type="date" value={form.date_of_birth} onChange={e => {
                  const value = e.target.value;
                  setForm(prev => ({ ...prev, date_of_birth: value, age: calculateAge(value) }));
                }} max={today} />
              </div>
              <div className="form-group">
                <label className="form-label">D. Sex</label>
                <div className="checkbox-group" style={{ paddingTop:8 }}>
                  {['M','F'].map(s => (
                    <label key={s} className="checkbox-item">
                      <input type="radio" name="sex" value={s} checked={form.sex === s} onChange={() => set('sex', s)} />
                      {s === 'M' ? '♂ Male' : '♀ Female'}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">G. Contact No.</label>
                <input className="form-input" type="tel" inputMode="numeric" maxLength={13} value={form.contact_no} onChange={e => set('contact_no', formatPhilippineContact(e.target.value))} placeholder="09XX XXX XXXX" />
              </div>
              <div className="form-group">
                <label className="form-label">E. Age</label>
                <input className="form-input" type="number" value={form.age} onChange={e => set('age', e.target.value)} min="0" placeholder="Auto-calculated or enter age" />
              </div>
              <div className="form-group">
                <label className="form-label">F. Weight (kg)</label>
                <input className="form-input" type="number" value={form.weight} onChange={e => set('weight', e.target.value)} min="0" step="0.1" placeholder="kg" />
              </div>
            </div>
          </div>

          {/* Section II */}
          <div className="section-box">
            <div className="section-box-title">II. Detail of Incidence / Exposure</div>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">A. Date / Time of Bite</label>
                <input className="form-input" type="datetime-local" value={form.bite_datetime} onChange={e => set('bite_datetime', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">B. Place of Exposure</label>
                <input className="form-input" type="text" value={form.place_of_exposure} onChange={e => set('place_of_exposure', e.target.value)} placeholder="e.g. Home, Road, Farm…" />
              </div>

              {/* Left: type + circumstance */}
              <div>
                <div className="form-group" style={{ marginBottom:14 }}>
                  <label className="form-label">C. Type of Exposure</label>
                  <div className="checkbox-group">
                    {['dog','cat','bat','other'].map(a => (
                      <label key={a} className="checkbox-item">
                        <input type="radio" name="animal" value={a} checked={form.animal_type === a} onChange={() => set('animal_type', a)} />
                        {a.charAt(0).toUpperCase() + a.slice(1)}
                      </label>
                    ))}
                  </div>
                  {form.animal_type === 'other' && (
                    <input className="form-input" style={{ marginTop:8 }} type="text" value={form.animal_other} onChange={e => set('animal_other', e.target.value)} placeholder="Please specify animal…" />
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">E. Circumstance</label>
                  <div className="checkbox-group">
                    {['provoked','unprovoked'].map(c => (
                      <label key={c} className="checkbox-item">
                        <input type="radio" name="circumstance" value={c} checked={form.circumstance === c} onChange={() => set('circumstance', c)} />
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: ownership */}
              <div className="form-group">
                <label className="form-label">D. Ownership</label>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    { val:'owned_vaccinated', label:'Owned / Vaccinated' },
                    { val:'owned_not_vaccinated', label:'Owned / Not Vaccinated' },
                    { val:'stray', label:'Stray' },
                    { val:'wild_rabid', label:'Wild / Rabid' },
                  ].map(o => (
                    <label key={o.val} className="checkbox-item">
                      <input type="radio" name="ownership" value={o.val} checked={form.ownership === o.val} onChange={() => set('ownership', o.val)} />
                      {o.label}
                    </label>
                  ))}
                  {form.ownership === 'owned_vaccinated' && (
                    <div className="form-group" style={{ marginTop:4 }}>
                      <label className="form-label">Vaccine Date</label>
                      <input className="form-input" type="date" value={form.pet_vaccine_date} onChange={e => set('pet_vaccine_date', e.target.value)} max={today} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Info note */}
          <div style={{ background:'var(--blue-50)', border:'1px solid var(--blue-200)', borderRadius:'var(--radius-md)', padding:'12px 16px', marginBottom:20, fontSize:14, color:'var(--blue-800)' }}>
            <strong>ℹ️ Note:</strong> Sections III–VII (Wound Description, History, Treatment) can be filled in after saving, by the doctor or nurse. The form can be printed blank for manual input, or updated directly in the system.
          </div>

          {/* Submit */}
          <div style={{ display:'flex', gap:12, justifyContent:'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => router.back()}>Cancel</button>
            <button type="submit" className="btn btn-primary" data-mode="record" disabled={saving}>
              {saving && saveMode === 'record' ? <><span className="spinner" style={{ width:16, height:16 }} /> Saving…</> : '✓ Save & Open Patient Record'}
            </button>
            <button type="submit" className="btn btn-secondary" data-mode="edit" disabled={saving}>
              {saving && saveMode === 'edit' ? <><span className="spinner" style={{ width:16, height:16 }} /> Saving…</> : 'Edit After Save'}
            </button>
          </div>
        </form>
      </div>

      {toast && (
        <div className="toast-container">
          <div className="toast">{toast}</div>
        </div>
      )}
    </div>
  );
}
