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

// Strip apostrophe text guard and ISO date corruption from batch/lot number fields
function cleanBatch(v: any): string {
  if (v === null || v === undefined) return '';
  let s = String(v).trim();
  if (s.startsWith("'")) s = s.slice(1).trim();
  // If Sheets coerced it into an ISO date string, extract only the date portion
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.split('T')[0];
  return s;
}

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
  const [customSite, setCustomSite] = useState('');
  const [allergyKnown, setAllergyKnown] = useState<'' | boolean>(false);

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
    tetanus_units: '',
    tetanus_admin_by: '',
    hiv: false,
    immunosuppressant: false,
    long_term_steroid: false,
    chloroquine: false,
    malignancy: false,
    congenital_immuno: false,
    hematologic_condition: false,
    chronic_liver_disease: false,
    other_conditions: '',
    anti_tetanus_vaccine: false,
    anti_rabies_completed: false,
    anti_rabies_details: '',
    folk_remedy: false,
    folk_remedy_details: '',
    smoker: false,
    alcoholic: false,
    allergy: '',
    physician_notes: '',
    dose_type: 'PEP',
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
      setDoctors((initRes.data.accounts || []).filter((u: any) =>
        u.role === 'doctor' && String(u.full_name || '').trim().toLowerCase() !== 'system administrator'
      ));
    }
    if (patRes.status === 'ok') {
      const inc = patRes.data.incidents?.find((i: any) => i.incident_id === incident_id);
      const incidentDoses = (patRes.data.doses || []).filter((d: any) => d.incident_id === incident_id);
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
          erig_hrig_batch: cleanBatch(inc.erig_hrig_batch),
          erig_hrig_date: inc.erig_hrig_date || '',
          erig_hrig_administered_by: inc.erig_hrig_administered_by || '',
          tetanus_vaccine_status: inc.tetanus_vaccine_status || '',
          tetanus_date: inc.tetanus_date || '',
          tetanus_type: inc.tetanus_type || '',
          tetanus_brand: inc.tetanus_brand || '',
          tetanus_batch: cleanBatch(inc.tetanus_batch),
          tetanus_units: inc.tetanus_units || '',
          tetanus_admin_by: inc.tetanus_admin_by || '',
          hiv: !!inc.hiv, immunosuppressant: !!inc.immunosuppressant,
          long_term_steroid: !!inc.long_term_steroid, chloroquine: !!inc.chloroquine,
          malignancy: !!inc.malignancy, congenital_immuno: !!inc.congenital_immuno,
          hematologic_condition: !!inc.hematologic_condition,
          chronic_liver_disease: !!inc.chronic_liver_disease,
          other_conditions: inc.other_conditions || '',
          anti_tetanus_vaccine: !!inc.anti_tetanus_vaccine,
          anti_rabies_completed: !!inc.anti_rabies_completed,
          anti_rabies_details: (() => { const v = inc.anti_rabies_details || ''; if (v && v.includes('T') && v.includes('Z')) { try { const d = new Date(v); return d.toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' }); } catch(e) { return v; } } return v; })(),
          folk_remedy: !!inc.folk_remedy,
          folk_remedy_details: inc.folk_remedy_details || '',
          smoker: !!inc.smoker, alcoholic: !!inc.alcoholic,
          allergy: inc.allergy || '',
          physician_notes: inc.physician_notes || '',
          dose_type: (() => {
            const t = String(incidentDoses[0]?.dose_type || 'PEP');
            // Legacy booster stored as dose_type='PEP' with pep_doses_needed=1 — normalise to 'Booster'
            if (t === 'PEP' && Number(inc.pep_doses_needed) === 1) return 'Booster';
            return t;
          })(),
          pep_doses_needed: inc.pep_doses_needed || 5,
          referring_doctor: inc.referring_doctor || '',
          consult_date: inc.consult_date || '',
        });
        setAllergyKnown(!!String(inc.allergy || '').trim());
      }
    }
    setLoading(false);
  }

  const set = (k: string, v: any) => setF(prev => ({ ...prev, [k]: v }));
  const clearableRadioProps = (current: any, value: any, onSelect: () => void, onClear: () => void) => ({
    checked: Object.is(current, value),
    onMouseDown: (e: React.MouseEvent<HTMLInputElement>) => {
      if (Object.is(current, value)) {
        e.preventDefault();
        onClear();
      }
    },
    onChange: onSelect,
  });

  function toggleSite(site: string) {
    const sites = [...f.anatomical_positions];
    const idx = sites.indexOf(site);
    if (idx >= 0) sites.splice(idx, 1); else sites.push(site);
    set('anatomical_positions', sites);
  }

  function addCustomSite() {
    const value = customSite.trim();
    if (!value) return;
    if (!f.anatomical_positions.includes(value)) {
      set('anatomical_positions', [...f.anatomical_positions, value]);
    }
    setCustomSite('');
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
  const immunosuppressantChecked = !!(f.immunosuppressant || f.long_term_steroid || f.malignancy);
  const lifestyleNotApplicable = !f.smoker && !f.alcoholic;
  const hasAllergy = allergyKnown === true;

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

            {/* A. Anatomical Position — full width */}
            <div style={{ marginBottom: 20 }}>
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
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                <input className="form-input" type="text" value={customSite} onChange={e => setCustomSite(e.target.value)} placeholder="Custom / Others" />
                <button type="button" className="btn btn-secondary btn-sm" onClick={addCustomSite}>Add</button>
              </div>
              {f.anatomical_positions.length > 0 && (
                <div style={{ marginTop:8, fontSize:13, color:'var(--red-700)', fontWeight:500 }}>
                  Marked: {f.anatomical_positions.join(', ')}
                </div>
              )}
            </div>

            {/* B–E in a 2-column grid below anatomical */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
              {/* Left col: B, C */}
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div>
                  <div className="form-label" style={{ marginBottom:8 }}>B. Wound Status</div>
                  <div className="checkbox-group">
                    {[{val:'bleeding',label:'Bleeding'},{val:'non_bleeding',label:'Non-Bleeding'}].map(o => (
                      <label key={o.val} className="checkbox-item">
                        <input type="radio" name="wound_status" value={o.val} {...clearableRadioProps(f.wound_status, o.val, () => set('wound_status', o.val), () => set('wound_status', ''))} style={{ width:16, height:16, accentColor:'var(--blue-600)' }} />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="form-label" style={{ marginBottom:8 }}>C. Wound Category</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {[
                      { val:'I', label:'Category I', items:[
                        'a. Feeding/Touching',
                        'b. Licking of intact skin (with reliable history and thorough physical examination)',
                        'c. Exposure to patient with signs and symptoms for rabies by sharing of eating or drinking utensils',
                        'd. Casual contact (talking to, visiting and feeding suspected rabies cases) and routine delivery of health care to patient with signs and symptoms of rabies',
                      ]},
                      { val:'II', label:'Category II', items:[
                        'a. Nibbling of uncovered skin with or without bruising/hematoma',
                        'b. Minor/superficial scratches/abrasions without bleeding, including those induced to bleeding',
                        'c. All Category II exposures on the head and neck area are considered Category III and shall be managed as such',
                      ]},
                      { val:'III', label:'Category III', items:[
                        'a. Transdermal bites (puncture wounds, lacerations, avulsions) or scratches/abrasions with spontaneous bleeding',
                        'b. Licks on broken skin or mucous membrane',
                        'c. Exposure to a rabies patient through bites, contamination of mucous membranes (eyes, oral/nasal mucous, genital/anal mucous membrane) or open skin lesions with body fluids through splattering and mouth-to-mouth resuscitation',
                        'd. Unprotected handling of infected carcass',
                        'e. Ingestion of raw infected meat',
                        'f. Exposure to bats',
                        'g. All Category II exposures on head and neck area',
                      ]},
                    ].map(cat => (
                      <label key={cat.val} style={{ display:'flex', gap:10, cursor:'pointer', padding:'10px 12px', borderRadius:'var(--radius-md)', border:'1.5px solid', borderColor: f.wound_category===cat.val ? 'var(--blue-500)' : 'var(--slate-200)', background: f.wound_category===cat.val ? 'var(--blue-50)' : 'white', transition:'all .12s' }}>
                        <input type="radio" name="wound_category" value={cat.val} {...clearableRadioProps(f.wound_category, cat.val, () => set('wound_category', cat.val), () => set('wound_category', ''))} style={{ marginTop:2, width:16, height:16, accentColor:'var(--blue-600)', flexShrink:0 }} />
                        <div>
                          <div style={{ fontWeight:600, fontSize:14, color: f.wound_category===cat.val ? 'var(--blue-800)' : 'var(--slate-700)' }}>{cat.label}</div>
                          <div style={{ fontSize:11, color:'var(--slate-500)', marginTop:3, lineHeight:1.5 }}>
                            {cat.items.map((item: string, i: number) => <div key={i}>{item}</div>)}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right col: D, E */}
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div>
                  <div className="form-label" style={{ marginBottom:8 }}>D. Type of Wound</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {WOUND_TYPES.map(o => (
                      <label key={o.val} className="checkbox-item">
                        <input type="radio" name="wound_type" value={o.val} {...clearableRadioProps(f.wound_type, o.val, () => set('wound_type', o.val), () => set('wound_type', ''))} style={{ width:16, height:16, accentColor:'var(--blue-600)' }} />
                        {o.label}
                      </label>
                    ))}
                  </div>
                  {f.wound_type === 'other' && (
                    <input className="form-input" style={{ marginTop:8 }} type="text" value={f.wound_type_other} onChange={e => set('wound_type_other', e.target.value)} placeholder="Specify wound type…" />
                  )}
                </div>

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
            </div>{/* end B-E grid */}
          </div>

          {/* Section IV — History */}
          <div className="section-box">
            <div className="section-box-title">IV. History</div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

              {/* Left col: A — matches print form exactly */}
              <div>
                <div className="form-label" style={{ marginBottom:8 }}>A. Other Medical Conditions / On Treatment</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <label className="checkbox-item">
                    <Cb k="hiv" /> H.I.V.
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={immunosuppressantChecked}
                      onChange={e => {
                        set('immunosuppressant', e.target.checked);
                        set('long_term_steroid', e.target.checked);
                        set('malignancy', e.target.checked);
                      }}
                      style={{ width:16, height:16, accentColor:'var(--blue-600)', cursor:'pointer' }}
                    />
                    <span>Immunosuppressant Agent (Long-Term Steroid, Treatment of Malignancy etc.)</span>
                  </label>
                  <label className="checkbox-item">
                    <Cb k="chloroquine" /> Chloroquine
                  </label>
                  <label className="checkbox-item">
                    <Cb k="congenital_immuno" /> Congenital Immuno-deficiency (G6PD)
                  </label>
                  <label className="checkbox-item">
                    <Cb k="hematologic_condition" /> Hematologic Condition
                  </label>
                  <label className="checkbox-item">
                    <Cb k="chronic_liver_disease" /> Chronic Liver Disease
                  </label>
                </div>
                <div style={{ marginTop:10 }}>
                  <label className="form-label">Others (specify)</label>
                  <input className="form-input" type="text" value={f.other_conditions} onChange={e => set('other_conditions', e.target.value)} placeholder="Other conditions…" />
                </div>

                {/* B */}
                <div style={{ marginTop:14 }}>
                  <div className="form-label" style={{ marginBottom:8 }}>B. Anti-Tetanus Vaccine</div>
                  <div className="checkbox-group" style={{ marginBottom:8 }}>
                    <label className="checkbox-item"><input type="radio" name="anti_tetanus_v" value="true" {...clearableRadioProps(f.anti_tetanus_vaccine, true, () => set('anti_tetanus_vaccine', true), () => set('anti_tetanus_vaccine', ''))} style={{ width:16, height:16, accentColor:'var(--blue-600)' }} /> Yes</label>
                    <label className="checkbox-item"><input type="radio" name="anti_tetanus_v" value="false" {...clearableRadioProps(f.anti_tetanus_vaccine, false, () => set('anti_tetanus_vaccine', false), () => set('anti_tetanus_vaccine', ''))} style={{ width:16, height:16, accentColor:'var(--blue-600)' }} /> No</label>
                  </div>
                  {f.anti_tetanus_vaccine && (
                    <div className="form-group">
                      <label className="form-label">If yes - date given</label>
                      <input className="form-input" type="date" value={f.tetanus_date} onChange={e => set('tetanus_date', e.target.value)} />
                    </div>
                  )}
                  {f.anti_tetanus_vaccine === false && (
                    <div className="form-group">
                      <label className="form-label">Administer</label>
                      <div className="checkbox-group">
                        {['TT','TD','ATS'].map(t => (
                          <label key={t} className="checkbox-item">
                            <input type="radio" name="tet_type" value={t} {...clearableRadioProps(f.tetanus_type, t, () => set('tetanus_type', t), () => set('tetanus_type', ''))} style={{ width:16, height:16, accentColor:'var(--blue-600)' }} />
                            {t}
                          </label>
                        ))}
                      </div>
                      <div style={{ marginTop:10, display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        <div className="form-group">
                          <label className="form-label">Date Given</label>
                          <input className="form-input" type="date" value={f.tetanus_date} onChange={e => set('tetanus_date', e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Brand</label>
                          <input className="form-input" type="text" value={f.tetanus_brand} onChange={e => set('tetanus_brand', e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Batch No.</label>
                          <input className="form-input" type="text" value={f.tetanus_batch} onChange={e => set('tetanus_batch', e.target.value)} />
                        </div>
                        {f.tetanus_type === 'ATS' && (
                          <div className="form-group">
                            <label className="form-label">ATS Units</label>
                            <input className="form-input" type="text" value={f.tetanus_units} onChange={e => set('tetanus_units', e.target.value)} placeholder="e.g. 1500 IU" />
                          </div>
                        )}
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

              </div>

              {/* Right col: C-F */}
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

                {/* C */}
                <div>
                  <div className="form-label" style={{ marginBottom:8 }}>C. Completed anti-rabies shots previously?</div>
                  <div className="checkbox-group" style={{ marginBottom:8 }}>
                    <label className="checkbox-item"><input type="radio" name="ar_comp" value="true" {...clearableRadioProps(f.anti_rabies_completed, true, () => set('anti_rabies_completed', true), () => set('anti_rabies_completed', ''))} style={{ width:16, height:16, accentColor:'var(--blue-600)' }} /> Yes</label>
                    <label className="checkbox-item"><input type="radio" name="ar_comp" value="false" {...clearableRadioProps(f.anti_rabies_completed, false, () => set('anti_rabies_completed', false), () => set('anti_rabies_completed', ''))} style={{ width:16, height:16, accentColor:'var(--blue-600)' }} /> No</label>
                  </div>
                  {f.anti_rabies_completed && (
                    <input className="form-input" type="text" value={f.anti_rabies_details} onChange={e => set('anti_rabies_details', e.target.value)} placeholder="Specify previous regimen…" />
                  )}
                </div>

                {/* D */}
                <div>
                  <div className="form-label" style={{ marginBottom:8 }}>D. Consulted folk healer / tambal first?</div>
                  <div className="checkbox-group" style={{ marginBottom:8 }}>
                    <label className="checkbox-item"><input type="radio" name="folk" value="true" {...clearableRadioProps(f.folk_remedy, true, () => set('folk_remedy', true), () => set('folk_remedy', ''))} style={{ width:16, height:16, accentColor:'var(--blue-600)' }} /> Yes</label>
                    <label className="checkbox-item"><input type="radio" name="folk" value="false" {...clearableRadioProps(f.folk_remedy, false, () => set('folk_remedy', false), () => set('folk_remedy', ''))} style={{ width:16, height:16, accentColor:'var(--blue-600)' }} /> No</label>
                  </div>
                  {f.folk_remedy && (
                    <input className="form-input" type="text" value={f.folk_remedy_details} onChange={e => set('folk_remedy_details', e.target.value)} placeholder="Tambal, Tanduk, etc…" />
                  )}
                </div>

                {/* E */}
                <div>
                  <div className="form-label" style={{ marginBottom:8 }}>E. Current Lifestyle</div>
                  <div className="checkbox-group">
                    <label className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={!!f.smoker}
                        onChange={e => set('smoker', e.target.checked)}
                        style={{ width:16, height:16, accentColor:'var(--blue-600)', cursor:'pointer' }}
                      /> Smoker
                    </label>
                    <label className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={!!f.alcoholic}
                        onChange={e => set('alcoholic', e.target.checked)}
                        style={{ width:16, height:16, accentColor:'var(--blue-600)', cursor:'pointer' }}
                      /> Alcohol use
                    </label>
                    <label className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={lifestyleNotApplicable}
                        onChange={e => {
                          if (e.target.checked) {
                            set('smoker', false);
                            set('alcoholic', false);
                          }
                        }}
                        style={{ width:16, height:16, accentColor:'var(--blue-600)', cursor:'pointer' }}
                      /> Not Applicable
                    </label>
                  </div>
                </div>

                {/* F */}
                <div>
                  <div className="form-label" style={{ marginBottom:8 }}>F. Do you have any known allergies to medications or foods?</div>
                  <div className="checkbox-group" style={{ marginBottom:8 }}>
                    <label className="checkbox-item">
                      <input
                        type="radio"
                        name="known_allergy"
                        {...clearableRadioProps(allergyKnown, true, () => setAllergyKnown(true), () => {
                          setAllergyKnown('');
                          set('allergy', '');
                        })}
                        style={{ width:16, height:16, accentColor:'var(--blue-600)' }}
                      /> Yes
                    </label>
                    <label className="checkbox-item">
                      <input
                        type="radio"
                        name="known_allergy"
                        {...clearableRadioProps(allergyKnown, false, () => {
                          setAllergyKnown(false);
                          set('allergy', '');
                        }, () => setAllergyKnown(''))}
                        style={{ width:16, height:16, accentColor:'var(--blue-600)' }}
                      /> No
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Specify</label>
                    <input
                      className="form-input"
                      type="text"
                      value={f.allergy}
                      onChange={e => set('allergy', e.target.value)}
                      placeholder="Specify allergies"
                      disabled={!hasAllergy}
                    />
                  </div>
                </div>

              </div>{/* end right col C-F */}
            </div>{/* end A|C-F grid */}
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
                      <input type="radio" name="erig_hrig" value={val} {...clearableRadioProps(f.erig_hrig, val, () => set('erig_hrig', val), () => set('erig_hrig', ''))} style={{ width:16, height:16, accentColor:'var(--blue-600)' }} />
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
                      <select className="form-select" value={f.erig_hrig_administered_by.startsWith('OTHER:') ? 'OTHER' : f.erig_hrig_administered_by} onChange={e => {
                        if (e.target.value === 'OTHER') set('erig_hrig_administered_by', 'OTHER:');
                        else set('erig_hrig_administered_by', e.target.value);
                      }}>
                        <option value="">-- Select --</option>
                        {nurses.map(n => <option key={n.user_id} value={n.user_id}>{n.full_name}</option>)}
                        <option value="OTHER">Others (specify)</option>
                      </select>
                      {f.erig_hrig_administered_by.startsWith('OTHER:') && (
                        <input
                          className="form-input"
                          type="text"
                          style={{ marginTop: 6 }}
                          placeholder="Specify facility / administrator…"
                          value={f.erig_hrig_administered_by.slice(6)}
                          onChange={e => set('erig_hrig_administered_by', 'OTHER:' + e.target.value)}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="form-label" style={{ marginBottom:8 }}>PEP / PrEP Doses Required</div>
                <select
                  className="form-select"
                  value={`${f.dose_type}:${f.pep_doses_needed}`}
                  onChange={e => {
                    const [doseType, doseCount] = e.target.value.split(':');
                    set('dose_type', doseType);
                    set('pep_doses_needed', Number(doseCount));
                  }}
                >
                  <option value="PEP:5">PEP - 5 doses (D0, D3, D7, D14, D28/30)</option>
                  <option value="PEP:4">PEP - 4 doses (D0, D3, D7, D28/30)</option>
                  <option value="PrEP:3">PrEP - 3 doses (D0, D7, D21/28)</option>
                  <option value="Booster:1">Booster - 2 doses (D0, D3)</option>
                </select>
                <div style={{ fontSize:12, color:'var(--slate-500)', lineHeight:1.5, marginTop:8 }}>
                  Schedule dates stay blank until D0 is actually administered. Once D0 is given, the remaining schedule is auto-calculated.
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
