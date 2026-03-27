'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const BODY_SITES = ['Head','Neck','R.Arm','L.Arm','R.Hand','L.Hand','Chest','Abdomen','Upper Back','Lower Back','R.Leg','L.Leg','R.Foot','L.Foot','Genitalia'];
const WOUND_TYPES = [
  { val:'superficial', label:'Superficial Scratches' },
  { val:'abrasion', label:'Abrasion' },
  { val:'transdermal', label:'Multiple transdermal bites/scratches' },
  { val:'lick', label:'Lick' },
  { val:'mucus', label:'Contamination of Mucus Membrane' },
  { val:'other', label:'Others (specify below)' },
];

export default function IncidentEditPage() {
  const { user, activeNurse } = useAuth();
  const router = useRouter();
  const params = useParams();
  const patient_id = params.id as string;
  const incident_id = params.incidentId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [nurses, setNurses] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);

  const [f, setF] = useState<Record<string, any>>({
    consult_date: '',
    wound_category: '',
    wound_status: '',
    wound_type: '',
    wound_type_other: '',
    anatomical_positions: [],
    wound_wash: false,
    antiseptic_applied: false,
    erig_hrig: '',
    erig_hrig_brand: '',
    erig_hrig_batch: '',
    erig_hrig_date: '',
    erig_hrig_administered_by: '',
    tetanus_vaccine_status: '',
    tetanus_date: '',
    tetanus_type: '',
    tetanus_brand: '',
    tetanus_batch: '',
    tetanus_admin_by: '',
    hiv: false,
    immunosuppressant: false,
    long_term_steroid: false,
    chloroquine: false,
    malignancy: false,
    congenital_immuno: false,
    other_conditions: '',
    anti_tetanus_vaccine: false,
    anti_rabies_completed: false,
    anti_rabies_details: '',
    folk_remedy: false,
    folk_remedy_details: '',
    smoker: false,
    alcoholic: false,
    physician_notes: '',
    pep_doses_needed: 5,
    referring_doctor: '',
  });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [patRes, initRes] = await Promise.all([
      api.getPatient(patient_id),
      api.getInitData(),
    ]);
    if (initRes.status === 'ok') {
      setNurses(initRes.data.nurses || []);
      setDoctors((initRes.data.accounts || []).filter((u: any) => u.role === 'doctor' || u.role === 'admin'));
    }
    if (patRes.status === 'ok') {
      const inc = patRes.data.incidents?.find((i: any) => i.incident_id === incident_id);
      if (inc) {
        setF({
          wound_category: inc.wound_category || '',
          wound_status: inc.wound_status || '',
          wound_type: inc.wound_type || '',
          wound_type_other: inc.wound_type_other || '',
          anatomical_positions: (() => { try { return JSON.parse(inc.anatomical_positions || '[]'); } catch { return []; }})(),
          wound_wash: inc.wound_wash === true || inc.wound_wash === 'true',
          antiseptic_applied: inc.antiseptic_applied === true || inc.antiseptic_applied === 'true',
          erig_hrig: inc.erig_hrig || '',
          erig_hrig_brand: inc.erig_hrig_brand || '',
          erig_hrig_batch: inc.erig_hrig_batch || '',
          erig_hrig_date: inc.erig_hrig_date || '',
          erig_hrig_administered_by: inc.erig_hrig_administered_by || '',
          tetanus_vaccine_status: inc.tetanus_vaccine_status || '',
          tetanus_date: inc.tetanus_date || '',
          tetanus_type: inc.tetanus_type || '',
          tetanus_brand: inc.tetanus_brand || '',
          tetanus_batch: inc.tetanus_batch || '',
          tetanus_admin_by: inc.tetanus_admin_by || '',
          hiv: !!inc.hiv, immunosuppressant: !!inc.immunosuppressant,
          long_term_steroid: !!inc.long_term_steroid, chloroquine: !!inc.chloroquine,
          malignancy: !!inc.malignancy, congenital_immuno: !!inc.congenital_immuno,
          other_conditions: inc.other_conditions || '',
          anti_tetanus_vaccine: !!inc.anti_tetanus_vaccine,
          anti_rabies_completed: !!inc.anti_rabies_completed,
          anti_rabies_details: inc.anti_rabies_details || '',
          folk_remedy: !!inc.folk_remedy,
          folk_remedy_details: inc.folk_remedy_details || '',
          smoker: !!inc.smoker, alcoholic: !!inc.alcoholic,
          physician_notes: inc.physician_notes || '',
          pep_doses_needed: inc.pep_doses_needed || 5,
          referring_doctor: inc.referring_doctor || '',
          consult_date: inc.consult_date || '',
        });
      }
    }
    setLoading(false);
  }

  const set = (k: string, v: any) => setF(prev => ({ ...prev, [k]: v }));

  function toggleSite(site: string) {
    const sites = [...f.anatomical_positions];
    const idx = sites.indexOf(site);
    if (idx >= 0) sites.splice(idx, 1); else sites.push(site);
    set('anatomical_positions', sites);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const by = user?.role === 'nurse' && activeNurse ? activeNurse.user_id : user?.user_id;
    const payload = {
      ...f,
      incident_id,
      anatomical_positions: JSON.stringify(f.anatomical_positions),
      updated_by: by || '',
    };
    // ERIG/HRIG mutual exclusion already enforced by UI radio
    const res = await api.updateIncident(payload);
    setSaving(false);
    if (res.status === 'ok') {
      setToast('Incident updated ✓');
      setTimeout(() => router.push(`/patients/${patient_id}`), 1200);
    } else {
      setToast('Error: ' + res.message);
    }
  }

  const Cb = ({ k }: { k: string }) => (
    <input type="checkbox" checked={!!f[k]} onChange={e => set(k, e.target.checked)}
      style={{ width:16, height:16, accentColor:'var(--blue-600)', cursor:'pointer' }} />
  );

  if (loading) return <div className="page-loader"><div className="spinner" style={{ width:28, height:28 }} /></div>;

  return (
    <div>
      <div className="page-header no-print">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/patients/${patient_id}`)} style={{ marginBottom:8 }}>← Back to Patient</button>
          <h1 className="page-title">Update Clinical Data</h1>
          <p className="page-subtitle">Sections III – VII · Wound, History & Treatment</p>
        </div>
      </div>

      <div className="page-body">
        <form onSubmit={handleSubmit}>

          {/* Section III — Wound */}
          <div className="section-box">
            <div className="section-box-title">III. Wound Description / Wound Care</div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
              {/* Left */}
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

                {/* Anatomical position */}
                <div>
                  <div className="form-label" style={{ marginBottom:8 }}>A. Anatomical Position (click to mark)</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {BODY_SITES.map(site => (
                      <button key={site} type="button" onClick={() => toggleSite(site)}
                        style={{
                          padding:'5px 12px', borderRadius:20, fontSize:13, border:'1.5px solid', cursor:'pointer', transition:'all .12s',
                          borderColor: f.anatomical_positions.includes(site) ? 'var(--red-500)' : 'var(--slate-300)',
                          background: f.anatomical_positions.includes(site) ? '#fee2e2' : 'white',
                          color: f.anatomical_positions.includes(site) ? 'var(--red-700)' : 'var(--slate-600)',
                          fontWeight: f.anatomical_positions.includes(site) ? 600 : 400,
                        }}>
                        {f.anatomical_positions.includes(site) ? '✕ ' : ''}{site}
                      </button>
                    ))}
                  </div>
                  {f.anatomical_positions.length > 0 && (
                    <div style={{ marginTop:8, fontSize:13, color:'var(--red-700)', fontWeight:500 }}>
                      Marked: {f.anatomical_positions.join(', ')}
                    </div>
                  )}
                </div>

                {/* Wound care */}
                <div>
                  <div className="form-label" style={{ marginBottom:8 }}>E. Wound Care</div>
                  <label className="checkbox-item" style={{ marginBottom:8 }}>
                    <Cb k="wound_wash" /> e1. Wound Wash with soap and water
                  </label>
                  <label className="checkbox-item">
                    <Cb k="antiseptic_applied" /> e2. Antiseptic Applied (Povidone/Alcohol)
                  </label>
                </div>
              </div>

              {/* Right */}
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div>
                  <div className="form-label" style={{ marginBottom:8 }}>B. Wound Status</div>
                  <div className="checkbox-group">
                    {[{val:'bleeding',label:'Bleeding'},{val:'non_bleeding',label:'Non-Bleeding'}].map(o => (
                      <label key={o.val} className="checkbox-item">
                        <input type="radio" name="wound_status" value={o.val} checked={f.wound_status===o.val} onChange={() => set('wound_status', o.val)} style={{ width:16, height:16, accentColor:'var(--blue-600)' }} />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="form-label" style={{ marginBottom:8 }}>C. Wound Category</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {[
                      { val:'I', label:'Category I', desc:'Touching or feeding animals, licks on intact skin, contact of intact skin with secretions/excretions of rabid animal or person.' },
                      { val:'II', label:'Category II', desc:'Nibbling of uncovered skin, minor scratches or abrasions without bleeding.' },
                      { val:'III', label:'Category III', desc:'Single or multiple transdermal bites or scratches, licks on broken skin, contamination of mucous membrane with saliva from licks and exposure to bats.' },
                    ].map(c => (
                      <label key={c.val} style={{ display:'flex', gap:10, cursor:'pointer', padding:'10px 12px', borderRadius:'var(--radius-md)', border:'1.5px solid', borderColor: f.wound_category===c.val ? 'var(--blue-500)' : 'var(--slate-200)', background: f.wound_category===c.val ? 'var(--blue-50)' : 'white', transition:'all .12s' }}>
                        <input type="radio" name="wound_category" value={c.val} checked={f.wound_category===c.val} onChange={() => set('wound_category', c.val)} style={{ marginTop:2, width:16, height:16, accentColor:'var(--blue-600)', flexShrink:0 }} />
                        <div>
                          <div style={{ fontWeight:600, fontSize:14, color: f.wound_category===c.val ? 'var(--blue-800)' : 'var(--slate-700)' }}>{c.label}</div>
                          <div style={{ fontSize:12, color:'var(--slate-500)', marginTop:2, lineHeight:1.4 }}>{c.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="form-label" style={{ marginBottom:8 }}>D. Type of Wound</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {WOUND_TYPES.map(o => (
                      <label key={o.val} className="checkbox-item">
                        <input type="radio" name="wound_type" value={o.val} checked={f.wound_type===o.val} onChange={() => set('wound_type', o.val)} style={{ width:16, height:16, accentColor:'var(--blue-600)' }} />
                        {o.label}
                      </label>
                    ))}
                  </div>
                  {f.wound_type === 'other' && (
                    <input className="form-input" style={{ marginTop:8 }} type="text" value={f.wound_type_other} onChange={e => set('wound_type_other', e.target.value)} placeholder="Specify wound type…" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section IV — History */}
          <div className="section-box">
            <div className="section-box-title">IV. History</div>

            <div style={{ marginBottom:14 }}>
              <div className="form-label" style={{ marginBottom:8 }}>A. Other Medical Conditions / On Treatment</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[
                  { k:'hiv', label:'H.I.V.' },
                  { k:'immunosuppressant', label:'Immunosuppressant Agent' },
                  { k:'long_term_steroid', label:'Long-Term Steroid' },
                  { k:'chloroquine', label:'Chloroquine' },
                  { k:'malignancy', label:'Treatment for Malignancy' },
                  { k:'congenital_immuno', label:'Congenital Immuno-deficiency' },
                ].map(item => (
                  <label key={item.k} className="checkbox-item">
                    <Cb k={item.k} /> {item.label}
                  </label>
                ))}
              </div>
              <div style={{ marginTop:10 }}>
                <label className="form-label">Others (specify)</label>
                <input className="form-input" type="text" value={f.other_conditions} onChange={e => set('other_conditions', e.target.value)} placeholder="Other conditions…" />
              </div>
            </div>

            <div className="form-grid form-grid-2">
              <div>
                <div className="form-label" style={{ marginBottom:8 }}>B. Anti-Tetanus Vaccine</div>
                <div className="checkbox-group" style={{ marginBottom:8 }}>
                  <label className="checkbox-item"><input type="radio" name="anti_tetanus_v" value="true" checked={f.anti_tetanus_vaccine===true} onChange={() => set('anti_tetanus_vaccine', true)} style={{ width:16, height:16, accentColor:'var(--blue-600)' }} /> Yes</label>
                  <label className="checkbox-item"><input type="radio" name="anti_tetanus_v" value="false" checked={f.anti_tetanus_vaccine===false} onChange={() => set('anti_tetanus_vaccine', false)} style={{ width:16, height:16, accentColor:'var(--blue-600)' }} /> No</label>
                </div>
                {f.anti_tetanus_vaccine && (
                  <div className="form-group">
                    <label className="form-label">If yes — date given</label>
                    <input className="form-input" type="date" value={f.tetanus_date} onChange={e => set('tetanus_date', e.target.value)} />
                  </div>
                )}
                {f.anti_tetanus_vaccine === false && (
                  <div className="form-group">
                    <label className="form-label">Administer</label>
                    <div className="checkbox-group">
                      {['TT','TD','ATS'].map(t => (
                        <label key={t} className="checkbox-item">
                          <input type="radio" name="tet_type" value={t} checked={f.tetanus_type===t} onChange={() => set('tetanus_type', t)} style={{ width:16, height:16, accentColor:'var(--blue-600)' }} />
                          {t}
                        </label>
                      ))}
                    </div>
                    <div style={{ marginTop:10, display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                      <div className="form-group">
                        <label className="form-label">Brand</label>
                        <input className="form-input" type="text" value={f.tetanus_brand} onChange={e => set('tetanus_brand', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Batch No.</label>
                        <input className="form-input" type="text" value={f.tetanus_batch} onChange={e => set('tetanus_batch', e.target.value)} />
                      </div>
                      <div className="form-group" style={{ gridColumn:'1 / -1' }}>
                        <label className="form-label">Administered By</label>
                        <select className="form-select" value={f.tetanus_admin_by} onChange={e => set('tetanus_admin_by', e.target.value)}>
                          <option value="">-- Select nurse --</option>
                          {nurses.map(n => <option key={n.user_id} value={n.user_id}>{n.full_name}{n.credential ? `, ${n.credential}` : ''}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div>
                  <div className="form-label" style={{ marginBottom:8 }}>C. Completed anti-rabies shots previously?</div>
                  <div className="checkbox-group" style={{ marginBottom:8 }}>
                    <label className="checkbox-item"><input type="radio" name="ar_comp" value="true" checked={f.anti_rabies_completed===true} onChange={() => set('anti_rabies_completed', true)} style={{ width:16, height:16, accentColor:'var(--blue-600)' }} /> Yes</label>
                    <label className="checkbox-item"><input type="radio" name="ar_comp" value="false" checked={f.anti_rabies_completed===false} onChange={() => set('anti_rabies_completed', false)} style={{ width:16, height:16, accentColor:'var(--blue-600)' }} /> No</label>
                  </div>
                  {f.anti_rabies_completed && (
                    <input className="form-input" type="text" value={f.anti_rabies_details} onChange={e => set('anti_rabies_details', e.target.value)} placeholder="Specify previous regimen…" />
                  )}
                </div>
                <div>
                  <div className="form-label" style={{ marginBottom:8 }}>D. Consulted folk healer / tambal first?</div>
                  <div className="checkbox-group" style={{ marginBottom:8 }}>
                    <label className="checkbox-item"><input type="radio" name="folk" value="true" checked={f.folk_remedy===true} onChange={() => set('folk_remedy', true)} style={{ width:16, height:16, accentColor:'var(--blue-600)' }} /> Yes</label>
                    <label className="checkbox-item"><input type="radio" name="folk" value="false" checked={f.folk_remedy===false} onChange={() => set('folk_remedy', false)} style={{ width:16, height:16, accentColor:'var(--blue-600)' }} /> No</label>
                  </div>
                  {f.folk_remedy && (
                    <input className="form-input" type="text" value={f.folk_remedy_details} onChange={e => set('folk_remedy_details', e.target.value)} placeholder="Tambal, Tanduk, etc…" />
                  )}
                </div>
                <div>
                  <div className="form-label" style={{ marginBottom:8 }}>E. Lifestyle</div>
                  <div className="checkbox-group">
                    <label className="checkbox-item"><Cb k="smoker" /> Smoker</label>
                    <label className="checkbox-item"><Cb k="alcoholic" /> Alcoholic Drinker</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section V — Physician Notes */}
          <div className="section-box">
            <div className="section-box-title">V. Physician's Order / Notes</div>
            <div className="form-group" style={{ marginBottom:12 }}>
              <label className="form-label">Assessing / Attending Physician</label>
              {doctors.length > 0 ? (
                <select className="form-select" value={f.referring_doctor} onChange={e => set('referring_doctor', e.target.value)}>
                  <option value="">-- Select physician --</option>
                  {doctors.map((d: any) => (
                    <option key={d.user_id} value={d.user_id}>
                      {d.full_name}{d.credential ? `, ${d.credential}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ fontSize:13, color:'var(--slate-400)', padding:'8px 12px', background:'var(--slate-50)', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--slate-200)' }}>
                  No physician accounts found. Ask admin to add a doctor account.
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Physician's Order / Notes</label>
              <textarea className="form-textarea" style={{ minHeight:90, width:'100%' }} value={f.physician_notes} onChange={e => set('physician_notes', e.target.value)} placeholder="Doctor's orders, clinical notes, referral instructions…" />
            </div>
          </div>

          {/* Section VI — Treatment setup */}
          <div className="section-box">
            <div className="section-box-title">VI. Treatment Setup</div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
              <div>
                <div className="form-group" style={{ marginBottom:14 }}>
                  <label className="form-label">Day 0 Date / Consultation Date</label>
                  <input className="form-input" type="date" value={f.consult_date} onChange={e => set('consult_date', e.target.value)} />
                  <div style={{ fontSize:12, color:'var(--slate-500)', marginTop:6 }}>
                    Updating Day 0 will automatically recalculate the remaining vaccine schedule dates.
                  </div>
                </div>
                {/* ERIG / HRIG — mutual exclusive */}
                <div className="form-label" style={{ marginBottom:8 }}>Anti-Rabies Immunoglobulin (ERIG or HRIG — choose one)</div>
                <div className="checkbox-group" style={{ marginBottom:12 }}>
                  {['ERIG','HRIG',''].map((val, i) => (
                    <label key={i} className="checkbox-item">
                      <input type="radio" name="erig_hrig" value={val} checked={f.erig_hrig===val} onChange={() => set('erig_hrig', val)} style={{ width:16, height:16, accentColor:'var(--blue-600)' }} />
                      {val || 'None'}
                    </label>
                  ))}
                </div>
                {f.erig_hrig && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    <div className="form-group">
                      <label className="form-label">Brand Name</label>
                      <input className="form-input" type="text" value={f.erig_hrig_brand} onChange={e => set('erig_hrig_brand', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Batch No.</label>
                      <input className="form-input" type="text" value={f.erig_hrig_batch} onChange={e => set('erig_hrig_batch', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Date Given</label>
                      <input className="form-input" type="date" value={f.erig_hrig_date} onChange={e => set('erig_hrig_date', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Administered By</label>
                      <select className="form-select" value={f.erig_hrig_administered_by} onChange={e => set('erig_hrig_administered_by', e.target.value)}>
                        <option value="">-- Select nurse --</option>
                        {nurses.map(n => <option key={n.user_id} value={n.user_id}>{n.full_name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="form-label" style={{ marginBottom:8 }}>PEP Doses Required</div>
                <div style={{ background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:'var(--radius-md)', padding:'12px 14px' }}>
                  <div className="checkbox-group" style={{ marginBottom:10 }}>
                    <label className="checkbox-item">
                      <input type="radio" name="pep_doses" value="5" checked={f.pep_doses_needed===5} onChange={() => set('pep_doses_needed', 5)} style={{ width:16, height:16, accentColor:'var(--blue-600)' }} />
                      5 doses (D0, D3, D7, D14, D28)
                    </label>
                    <label className="checkbox-item" style={{ marginTop:6 }}>
                      <input type="radio" name="pep_doses" value="3" checked={f.pep_doses_needed===3} onChange={() => set('pep_doses_needed', 3)} style={{ width:16, height:16, accentColor:'var(--blue-600)' }} />
                      3 doses (D0, D7, D21) — reduced regimen
                    </label>
                  </div>
                  <div style={{ fontSize:12, color:'var(--slate-500)', lineHeight:1.5 }}>
                    If 3-dose regimen: D3, D14, D28 will be marked as optional (grayed, not required for completion).
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop:8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => router.push(`/patients/${patient_id}`)}>Cancel</button>
            <button type="button" className="btn btn-secondary" onClick={() => router.push(`/patients/${patient_id}/print`)}>🖨 Print Form</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner" style={{ width:16, height:16 }} /> Saving…</> : '✓ Save Clinical Data'}
            </button>
          </div>
        </form>
      </div>

      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.includes('Error') ? 'error' : 'success'}`}>{toast}</div>
        </div>
      )}
    </div>
  );
}
