'use client';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function NewIncidentPage() {
  const { user, activeNurse } = useAuth();
  const router = useRouter();
  const params = useParams();
  const patient_id = params.id as string;
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const [form, setForm] = useState({
    bite_datetime: '',
    place_of_exposure: '',
    animal_type: 'dog',
    animal_other: '',
    ownership: '',
    pet_vaccine_date: '',
    circumstance: '',
    pep_doses_needed: 5,
  });

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));
  const today = new Date().toISOString().split('T')[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const creator = user?.role === 'nurse' && activeNurse ? activeNurse.user_id : user?.user_id;
    const res = await api.createIncident({
      patient_id,
      consult_date: today,
      ...form,
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
            <div className="section-box-title">PEP Doses Required</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                { val:5, label:'5 doses — Standard PEP (D0, D3, D7, D14, D28)' },
                { val:3, label:'3 doses — Reduced regimen (D0, D7, D21)' },
                { val:2, label:'Booster only (D0, D3) — Patient previously completed 3-dose regimen within 5 years, animal confirmed healthy after 6–12 months' },
              ].map(opt => (
                <label key={opt.val} style={{ display:'flex', gap:10, padding:'10px 12px', borderRadius:'var(--radius-md)', border:'1.5px solid', cursor:'pointer', transition:'all .12s', borderColor: form.pep_doses_needed===opt.val ? 'var(--blue-500)' : 'var(--slate-200)', background: form.pep_doses_needed===opt.val ? 'var(--blue-50)' : 'white' }}>
                  <input type="radio" name="pep_doses" value={opt.val} checked={form.pep_doses_needed===opt.val} onChange={() => set('pep_doses_needed', opt.val)} style={{ accentColor:'var(--blue-600)', marginTop:2, flexShrink:0 }} />
                  <span style={{ fontSize:13 }}>{opt.label}</span>
                </label>
              ))}
            </div>
            {form.pep_doses_needed === 2 && (
              <div className="alert alert-amber" style={{ marginTop:10, fontSize:12 }}>
                <span>ℹ</span> Booster applies only if: (1) patient previously completed full 3-dose regimen, (2) more than 6 months have passed, and (3) the responsible animal is confirmed healthy/alive. Confirm with the attending physician.
              </div>
            )}
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
