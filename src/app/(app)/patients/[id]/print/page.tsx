'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function PrintPage() {
  const router = useRouter();
  const { activeNurse } = useAuth();
  const params = useParams();
  const patient_id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<Record<string,any>>({});

  useEffect(() => {
    Promise.all([api.getPatient(patient_id), api.getAccounts()]).then(([patRes, usersRes]) => {
      if (patRes.status === 'ok') setData(patRes.data);
      if (usersRes.status === 'ok') {
        const map: Record<string,any> = {};
        usersRes.data.forEach((u: any) => { map[u.user_id] = u; });
        setAllUsers(map);
      }
    });
  }, [patient_id]);

  if (!data) return <div style={{ fontFamily:'Arial', padding:40, textAlign:'center' }}>Loading form…</div>;

  const { patient, incidents, doses } = data;
  const incident = incidents?.[incidents.length - 1] || {};
  const incDoses = (doses || []).filter((d: any) => d.incident_id === incident.incident_id);

  const fullDate = (d: string) => {
    if (!d) return '';
    const clean = String(d).includes('T') ? d.split('T')[0] : d;
    if (!clean || clean === 'undefined') return '';
    return new Date(clean + 'T00:00:00').toLocaleDateString('en-PH', { month:'long', day:'numeric', year:'numeric' });
  };
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
    if (s.includes('T') && s.endsWith('Z')) return s.split('T')[0];
    return s;
  };
  const doseRoute = (d: any) => {
    const raw = pickDoseField(d, ['route', 'Route', 'dose_route', 'vaccine_route']).toLowerCase();
    if (!raw) return '';
    if (raw === 'intradermal') return 'Intradermal';
    if (raw === 'intramuscular') return 'Intramuscular';
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
  const fmtDateTime = (d: string) => d ? new Date(d).toLocaleString('en-PH', { month:'long', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '';

  const Cb = ({ checked }: { checked?: boolean }) => (
    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:12, height:12, border:'1px solid #333', marginRight:3, fontSize:9, verticalAlign:'middle', flexShrink:0 }}>
      {checked ? '✓' : ''}
    </span>
  );
  const Radio = ({ val, current, label }: { val:string; current:string; label:string }) => (
    <span style={{ marginRight:14, whiteSpace:'nowrap' }}><Cb checked={current === val} /> {label}</span>
  );

  const getUserName = (id: string) => { if (!id) return ''; const u = allUsers[id]; return u ? u.full_name : ''; };
  const getUserCred = (id: string) => { if (!id) return ''; const u = allUsers[id]; return u ? (u.credential || '') : ''; };
  const getUserLic  = (id: string) => { if (!id) return ''; const u = allUsers[id]; return u ? (u.license_no  || '') : ''; };

  const anatomicalSites: string[] = (() => { try { return JSON.parse(incident.anatomical_positions || '[]'); } catch { return []; }})();

  const pepDoseDays     = ['D0','D3','D7','D14','D28'];
  const prepDoseDays    = ['D0','D7','D14','D28'];
  const boosterDoseDays = ['D0','D3'];
  const pepDoses     = incDoses.filter((d: any) => d.dose_type !== 'PrEP' && d.dose_type !== 'Booster');
  const prepDoses    = incDoses.filter((d: any) => d.dose_type === 'PrEP');
  const boosterDoses = incDoses.filter((d: any) => d.dose_type === 'Booster');
  const bestDoseByDay = (rows: any[], day: string) => {
    const matches = rows.filter((d: any) => d.dose_day === day);
    if (!matches.length) return null;
    const score = (d: any) => {
      const route = doseRoute(d);
      const dose = doseAmount(d);
      return (String(d.status || '').toLowerCase() === 'done' ? 100 : 0)
        + (String(d.administered_date || '').trim() ? 10 : 0)
        + (String(d.brand_name || '').trim() ? 1 : 0)
        + (route ? 1 : 0)
        + (dose ? 1 : 0);
    };
    return matches.sort((a, b) => score(b) - score(a))[0];
  };
  const emptyDose = { dose_day: '', vaccine_type:'', brand_name:'', batch_no:'', administered_date:'', administered_by:'', scheduled_date:'', route:'', dose_volume:'', status:'' };
  const pepRows     = pepDoseDays.map(day     => bestDoseByDay(pepDoses,     day) || { ...emptyDose, dose_day: day });
  const prepRows    = prepDoseDays.map(day    => bestDoseByDay(prepDoses,    day) || { ...emptyDose, dose_day: day });
  const boosterRows = boosterDoseDays.map(day => bestDoseByDay(boosterDoses, day) || { ...emptyDose, dose_day: day });

  const nurseId  = activeNurse?.user_id || incDoses.find((d: any) => d.administered_by)?.administered_by || '';
  const doctorId = incident.referring_doctor || '';

  const CAT_I = [
    'a. Feeding/Touching',
    'b. Licking of intact skin (with reliable history and thorough physical examination)',
    'c. Exposure to patient with signs and symptoms for rabies by sharing of eating or drinking utensils',
    'd. Casual contact (talking to, visiting and feeding suspected rabies cases) and routine delivery of health care to patient with signs and symptoms of rabies',
  ];
  const CAT_II = [
    'a. Nibbling of uncovered skin with or without bruising/hematoma',
    'b. Minor/superficial scratches/abrasions without bleeding, including those induced to bleeding',
    'c. All Category II exposures on the head and neck area are considered Category III and shall be managed as such',
  ];
  const CAT_III = [
    'a. Transdermal bites (puncture wounds, lacerations, avulsions) or scratches/abrasions with spontaneous bleeding',
    'b. Licks on broken skin or mucous membrane',
    'c. Exposure to a rabies patient through bites, contamination of mucous membranes (eyes, oral/nasal mucous, genital/anal mucous membrane) or open skin lesions with body fluids through splattering and mouth-to-mouth resuscitation',
    'd. Unprotected handling of infected carcass',
    'e. Ingestion of raw infected meat',
    'f. Exposure to bats',
    'g. All Category II exposures on head and neck area',
  ];

  const catItems = (cat: string) => {
    if (cat === 'I') return CAT_I;
    if (cat === 'II') return CAT_II;
    return CAT_III;
  };

  return (
    <>
      <style>{`
        @page { size: A4; margin: 10mm 10mm 10mm 10mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 8pt; color: #000; background: white; margin: 0; }
        .page { width: 100%; min-height: 277mm; page-break-after: always; display: flex; flex-direction: column; }
        .page:last-child { page-break-after: auto; }
        .page-content { flex: 1; }
        .section { border: 1px solid #333; margin-bottom: 3px; }
        .section-title { background: #dce8f5; border-bottom: 1px solid #333; padding: 2px 6px; font-weight: bold; font-size: 8pt; }
        .section-body { padding: 3px 6px; }
        .row { display: flex; gap: 6px; align-items: baseline; margin-bottom: 2px; flex-wrap: wrap; }
        .lbl { font-weight: bold; white-space: nowrap; }
        .val { flex: 1; border-bottom: 1px solid #555; min-width: 60px; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; }
        .col { padding: 3px 6px; }
        .col+.col { border-left: 1px solid #333; }
        table { width: 100%; border-collapse: collapse; font-size: 7pt; }
        th, td { border: 1px solid #333; padding: 1px 2px; vertical-align: middle; }
        th { background: #dce8f5; font-weight: bold; text-align: center; }
        .sig-row { display: flex; justify-content: space-between; margin-top: 4px; gap: 20px; }
        .sig-block { text-align: center; flex: 1; }
        .sig-line { border-top: 1.5px solid #333; padding-top: 3px; }
        .footer { text-align:center; margin-top:2px; padding-top:3px; border-top:1.5px solid #1d4ed8; }
        @media screen {
          body { background: #ccc; }
          .page { background: white; max-width: 210mm; margin: 16px auto; padding: 10mm; box-shadow: 0 2px 16px rgba(0,0,0,.2); min-height: auto; }
        }
        @media print { .screen-controls { display: none !important; } }
      `}</style>

      <div className="screen-controls" style={{ position:'fixed', top:16, left:240, right:16, display:'flex', justifyContent:'space-between', alignItems:'center', zIndex:1000 }}>
        <button onClick={() => router.back()} style={{ padding:'8px 16px', background:'#1d4ed8', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:700 }}>← Back</button>
        <button onClick={() => window.print()} style={{ padding:'8px 20px', background:'#1d4ed8', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:700, boxShadow:'0 4px 12px rgba(29,78,216,.4)' }}>🖨 Print</button>
      </div>

      {/* ===== PAGE 1 ===== */}
      <div className="page">
        <div className="page-content">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:5, paddingBottom:5, borderBottom:'2px solid #1d4ed8' }}>
            <img src="/logos/bagong_pilipinas.jpg" alt="" style={{ width:46, height:46, objectFit:'contain' }} />
            <img src="/logos/lgu_logo.jpg"         alt="" style={{ width:46, height:46, objectFit:'contain' }} />
            <div style={{ textAlign:'center', flex:1 }}>
              <div style={{ fontSize:'12pt', fontWeight:900, letterSpacing:'.02em', color:'#1e3a8a' }}>RAGAY ANIMAL BITE TREATMENT CENTER</div>
              <div style={{ fontSize:'8pt', marginTop:1 }}>Poblacion, Ragay, Camarines Sur · Municipal Health Office</div>
            </div>
            <img src="/logos/rhu_logo.png" alt="" style={{ width:46, height:46, objectFit:'contain' }} />
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:'8pt' }}>
            <span><span className="lbl">Date of Consultation:</span> <span style={{ borderBottom:'1px solid #333', display:'inline-block', minWidth:155, paddingRight:8 }}>{fullDate(incident.consult_date) || fullDate((() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })())}</span></span>
            <span><span className="lbl">Patient ID No.:</span> <span style={{ fontFamily:'monospace', fontWeight:900, fontSize:'8.5pt', borderBottom:'1px solid #333', display:'inline-block', minWidth:95 }}>{patient.patient_id}</span></span>
          </div>

          {/* Section I */}
          <div className="section">
            <div className="section-title">I. Patient Information</div>
            <div className="section-body">
              <div className="row">
                <span className="lbl">A. Full Name:</span><span className="val">{patient.full_name}</span>
                <span className="lbl">D. Sex:</span>
                <span><Cb checked={patient.sex==='M'} /> M &nbsp; <Cb checked={patient.sex==='F'} /> F</span>
                <span className="lbl">G. Contact No.:</span><span className="val">{patient.contact_no}</span>
              </div>
              <div className="row">
                <span className="lbl">B. Address:</span><span className="val" style={{ flex:3 }}>{patient.address}</span>
                <span className="lbl">E. Age:</span><span className="val" style={{ minWidth:40 }}>{patient.age}</span>
              </div>
              <div className="row">
                <span className="lbl">C. Date of Birth:</span><span className="val" style={{ minWidth:120 }}>{fullDate(patient.date_of_birth)}</span>
                <span className="lbl">F. Weight:</span><span className="val" style={{ minWidth:60 }}>{patient.weight ? `${patient.weight} kg` : ''}</span>
              </div>
            </div>
          </div>

          {/* Section II */}
          <div className="section">
            <div className="section-title">II. Detail of Incidence / Exposure</div>
            <div className="two-col">
              <div className="col">
                <div className="row"><span className="lbl">A. Date/Time of Bite:</span><span className="val">{fmtDateTime(incident.bite_datetime)}</span></div>
                <div className="row"><span className="lbl">B. Place of Exposure:</span><span className="val">{incident.place_of_exposure}</span></div>
                <div style={{ marginTop:3, fontSize:'7.5pt' }}>
                  <span className="lbl">C. Type of Exposure: </span>
                  <Radio val="dog"   current={incident.animal_type||''} label="Dog" />
                  <Radio val="cat"   current={incident.animal_type||''} label="Cat" />
                  <Radio val="bat"   current={incident.animal_type||''} label="Bat" />
                  <Radio val="other" current={incident.animal_type||''} label={`Others: ${incident.animal_other||'_______'}`} />
                </div>
                <div style={{ marginTop:4, fontSize:'7.5pt' }}>
                  <span className="lbl">E. Circumstance: </span>
                  <Radio val="provoked"   current={incident.circumstance||''} label="Provoked" />
                  <Radio val="unprovoked" current={incident.circumstance||''} label="Unprovoked" />
                </div>
              </div>
              <div className="col" style={{ fontSize:'7.5pt' }}>
                <div style={{ marginBottom:3 }}><span className="lbl">D. Ownership:</span></div>
                <div><Cb checked={incident.ownership==='owned_vaccinated'}     /> Owned/Vaccinated &nbsp; (Date: <span style={{ borderBottom:'1px solid #333', display:'inline-block', minWidth:70 }}>{fullDate(incident.pet_vaccine_date)}</span>)</div>
                <div style={{ marginTop:3 }}><Cb checked={incident.ownership==='owned_not_vaccinated'} /> Owned / Not Vaccinated</div>
                <div style={{ marginTop:3 }}><Cb checked={incident.ownership==='stray'}                /> Stray</div>
                <div style={{ marginTop:3 }}><Cb checked={incident.ownership==='wild_rabid'}           /> Wild / Rabid</div>
              </div>
            </div>
          </div>

          {/* Section III — Anatomical full width, then B-E in 2 cols below */}
          <div className="section">
            <div className="section-title">III. Wound Description / Wound Care</div>
            <div className="section-body" style={{ paddingBottom:2 }}>

              {/* A. Anatomical — full width, 3 views */}
              <div style={{ marginBottom:4 }}>
                <strong style={{ fontSize:'7.5pt' }}>A. Anatomical Position</strong>
                <div style={{ border:'1px solid #aaa', marginTop:3, background:'#fff', padding:'6px 8px 4px' }}>
                  <div style={{ display:'flex', justifyContent:'center', alignItems:'flex-end', gap:0 }}>
                    <div style={{ textAlign:'center', flex:'1 1 0', paddingRight:8 }}>
                      <img src="/logos/anatomical_front.jpg" alt="Front"
                        style={{ height:185, width:'auto', objectFit:'contain', display:'block', margin:'0 auto' }} />
                      <div style={{ fontSize:'6pt', color:'#555', marginTop:2 }}>Front</div>
                    </div>
                    <div style={{ textAlign:'center', flex:'1 1 0' }}>
                      <img src="/logos/anatomical_back.jpg" alt="Back"
                        style={{ height:185, width:'auto', objectFit:'contain', display:'block', margin:'0 auto' }} />
                      <div style={{ fontSize:'6pt', color:'#555', marginTop:2 }}>Back</div>
                    </div>
                    <div style={{ textAlign:'center', flex:'1 1 0', paddingLeft:8 }}>
                      <img src="/logos/anatomical_side.jpg" alt="Side"
                        style={{ height:185, width:'auto', objectFit:'contain', display:'block', margin:'0 auto' }} />
                      <div style={{ fontSize:'6pt', color:'#555', marginTop:2 }}>Side</div>
                    </div>
                  </div>
                  <div style={{ fontSize:'7pt', marginTop:4, paddingLeft:2 }}>
                    <strong>Marked sites:</strong> {anatomicalSites.length > 0 ? anatomicalSites.join(', ') : '—'}
                  </div>
                </div>
              </div>

              {/* B–E below in 2 cols */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0, borderTop:'1px solid #ddd', paddingTop:3 }}>

                {/* Left: B, C */}
                <div style={{ paddingRight:6, borderRight:'1px solid #ddd', fontSize:'7.5pt' }}>
                  <div style={{ marginBottom:3 }}>
                    <strong>B. Wound Status: </strong>
                    <Cb checked={incident.wound_status==='bleeding'}     /> Bleeding &nbsp;
                    <Cb checked={incident.wound_status==='non_bleeding'} /> Non-Bleeding
                  </div>
                  <div>
                    <strong>C. Wound Category:</strong>
                    {['I','II','III'].map(cat => (
                      <div key={cat} style={{ marginTop:3, paddingLeft:2 }}>
                        <div style={{ fontWeight:'bold' }}>
                          <Cb checked={incident.wound_category===cat} /> Category {cat}
                        </div>
                        <div style={{ paddingLeft:14, fontSize:'6.5pt', lineHeight:1.5, color:'#333' }}>
                          {catItems(cat).map((item, i) => <div key={i}>{item}</div>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: D, E */}
                <div style={{ paddingLeft:6, fontSize:'7.5pt' }}>
                  <div style={{ marginBottom:4, lineHeight:1.7 }}>
                    <strong>D. Type of Wound:</strong>
                    {[
                      { val:'superficial', label:'Superficial Scratches' },
                      { val:'abrasion',    label:'Abrasion' },
                      { val:'transdermal', label:'Multiple transdermal bites/scratches' },
                      { val:'lick',        label:'Lick' },
                      { val:'mucus',       label:'Contamination of Mucus Membrane' },
                      { val:'other',       label:`Others: ${incident.wound_type_other||'___________'}` },
                    ].map(o => (
                      <div key={o.val}><Cb checked={incident.wound_type===o.val} /> {o.label}</div>
                    ))}
                  </div>
                  <div style={{ lineHeight:1.7 }}>
                    <strong>E. Wound Care</strong>
                    <div>e1. Wound Wash with soap and water: &nbsp; <Cb checked={incident.wound_wash===true||incident.wound_wash==='true'} /> Y &nbsp; <Cb checked={incident.wound_wash===false||incident.wound_wash==='false'} /> N</div>
                    <div>e2. Antiseptic Applied (Povidone/Alcohol): &nbsp; <Cb checked={incident.antiseptic_applied===true||incident.antiseptic_applied==='true'} /> Y &nbsp; <Cb checked={incident.antiseptic_applied===false||incident.antiseptic_applied==='false'} /> N</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="footer">
          <div style={{ fontSize:'9pt', fontWeight:800, color:'#1d4ed8', letterSpacing:'.12em' }}>BETTER · GREATER · HAPPIER</div>
          <div style={{ fontSize:'12pt', fontWeight:900, color:'#1e3a8a', letterSpacing:'.15em' }}>RAGAY</div>
        </div>
      </div>

      {/* ===== PAGE 2 ===== */}
      <div className="page">
        <div className="page-content">

          {/* Section IV — History: A left, B-F right */}
          <div className="section">
            <div className="section-title">IV. History</div>
            <div className="two-col">
              {/* Left: A */}
              <div className="col" style={{ fontSize:'7.5pt' }}>
                <div style={{ marginBottom:2 }}><strong>A. Other Medical Conditions / On Treatment:</strong></div>
                <div style={{ lineHeight:1.6 }}>
                  <div><Cb checked={!!incident.hiv}               /> H.I.V.</div>
                  <div><Cb checked={!!(incident.immunosuppressant || incident.long_term_steroid || incident.malignancy)} /> Immunosuppressant Agent (Long-Term Steroid, Treatment of Malignancy etc.)</div>
                  <div><Cb checked={!!incident.chloroquine}        /> Chloroquine</div>
                  <div><Cb checked={!!incident.congenital_immuno}  /> Congenital Immuno-deficiency (G6PD)</div>
                  <div><Cb checked={!!incident.hematologic_condition} /> Hematologic Condition</div>
                  <div><Cb checked={!!incident.chronic_liver_disease} /> Chronic Liver Disease</div>
                  <div style={{ marginTop:2 }}>Others: <span style={{ borderBottom:'1px solid #333', display:'inline-block', minWidth:100 }}>{incident.other_conditions||''}</span></div>
                </div>
              </div>
              {/* Right: B–F */}
              <div className="col" style={{ fontSize:'7.5pt', lineHeight:1.6 }}>
                <div><strong>B. Anti-Tetanus Vaccine:</strong> &nbsp; <Cb checked={incident.anti_tetanus_vaccine===true||incident.anti_tetanus_vaccine==='true'} /> Y &nbsp; <Cb checked={incident.anti_tetanus_vaccine===false||incident.anti_tetanus_vaccine==='false'} /> N &nbsp; {incident.anti_tetanus_vaccine ? `If yes: ${fullDate(incident.tetanus_date)||'____________'}` : ''}</div>
                <div><strong>C. Completed anti-rabies shots:</strong> &nbsp; <Cb checked={incident.anti_rabies_completed} /> Y &nbsp; <Cb checked={!incident.anti_rabies_completed} /> N &nbsp; {incident.anti_rabies_details ? `(${incident.anti_rabies_details})` : ''}</div>
                <div><strong>D. Consulted traditional/folk healers:</strong> &nbsp; <Cb checked={incident.folk_remedy} /> Y &nbsp; <Cb checked={!incident.folk_remedy} /> N &nbsp; {incident.folk_remedy_details||''}</div>
                <div>
                  <strong>E. Current Lifestyle:</strong> &nbsp;
                  <Cb checked={incident.smoker} /> Smoker &nbsp;&nbsp;
                  <Cb checked={incident.alcoholic} /> Alcohol use &nbsp;&nbsp;
                  <Cb checked={!incident.smoker && !incident.alcoholic} /> Not Applicable
                </div>
                <div>
                  <strong>F. Do you have any known allergies to medications or foods?</strong> &nbsp;
                  <Cb checked={!!String(incident.allergy || '').trim()} /> Yes &nbsp;
                  <Cb checked={!String(incident.allergy || '').trim()} /> No &nbsp;
                  Specify: <span style={{ borderBottom:'1px solid #333', display:'inline-block', minWidth:150 }}>{incident.allergy||''}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section V — bigger notes area */}
          <div className="section">
            <div className="section-title" style={{padding:'1px 6px'}}>V. Physician's Order / Notes</div>
            <div style={{ padding:'3px 6px', minHeight:50, fontSize:'8pt', whiteSpace:'pre-wrap' }}>{incident.physician_notes||''}</div>
          </div>

          {/* Section VI */}
          <div className="section">
            <div className="section-title" style={{padding:'1px 6px'}}>VI. Treatment</div>

            <div style={{ padding:'2px 5px 1px' }}>
              <div style={{ fontSize:'7pt', fontWeight:'bold', marginBottom:2 }}>PEP Schedule Date</div>
              <table>
                <thead><tr>
                  <th style={{ width:'8%', textAlign:'left', paddingLeft:4 }}>Dose</th>
                  <th style={{ width:'5%' }}>PVRV</th>
                  <th style={{ width:'5%' }}>PCEC</th>
                  <th style={{ width:'10%' }}>Brand</th>
                  <th style={{ width:'9%' }}>Batch</th>
                  <th style={{ width:'9%' }}>Route</th>
                  <th style={{ width:'7%' }}>Dose</th>
                  <th style={{ width:'15%' }}>Schedule Date</th>
                  <th style={{ width:'13%' }}>Date Given</th>
                  <th>Administered By</th>
                </tr></thead>
                <tbody>
                  {pepRows.map((d: any, i: number) => (
                    <tr key={i} style={{ background: i%2===0 ? 'white' : '#f0f4ff' }}>
                      <td style={{ fontWeight:'bold', fontSize:'7.5pt', paddingLeft:4 }}>{d.dose_day === 'D28' ? 'D 28/30' : d.dose_day.replace('D','D ')}</td>
                      <td style={{ textAlign:'center' }}><Cb checked={d.vaccine_type==='PVRV'} /></td>
                      <td style={{ textAlign:'center' }}><Cb checked={d.vaccine_type==='PCEC'} /></td>
                      <td style={{ fontSize:'7pt' }}>{d.brand_name||''}</td>
                      <td style={{ fontSize:'7pt' }}>{cleanBatchNo(pickDoseField(d, ['batch_no', 'Batch No.', 'Batch No', 'Batch / Lot Number']))||''}</td>
                      <td style={{ fontSize:'6.5pt' }}>{doseRoute(d)||''}</td>
                      <td style={{ fontSize:'6.5pt' }}>{doseAmount(d)||''}</td>
                      <td style={{ fontSize:'7pt' }}>{d.scheduled_date ? fullDate(d.scheduled_date) : ''}</td>
                      <td style={{ fontSize:'7pt', color: d.administered_date ? '#166534' : '#999' }}>{d.administered_date ? fullDate(d.administered_date) : '—'}</td>
                      <td style={{ fontSize:'7pt' }}>{getUserName(d.administered_by)}{getUserCred(d.administered_by) ? `, ${getUserCred(d.administered_by)}` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ padding:'2px 5px 1px' }}>
              <div style={{ fontSize:'7pt', fontWeight:'bold', marginBottom:2 }}>PrEP Schedule Date</div>
              <table>
                <thead><tr>
                  <th style={{ width:'8%', textAlign:'left', paddingLeft:4 }}>Dose</th>
                  <th style={{ width:'5%' }}>PVRV</th>
                  <th style={{ width:'5%' }}>PCEC</th>
                  <th style={{ width:'10%' }}>Brand</th>
                  <th style={{ width:'9%' }}>Batch</th>
                  <th style={{ width:'9%' }}>Route</th>
                  <th style={{ width:'7%' }}>Dose</th>
                  <th style={{ width:'15%' }}>Schedule Date</th>
                  <th style={{ width:'13%' }}>Date Given</th>
                  <th>Administered By</th>
                </tr></thead>
                <tbody>
                  {prepRows.map((d: any, i: number) => (
                    <tr key={i} style={{ background: i%2===0 ? 'white' : '#f0f4ff' }}>
                      <td style={{ fontWeight:'bold', fontSize:'7.5pt', paddingLeft:4 }}>{d.dose_day === 'D28' ? 'D 28/30' : d.dose_day.replace('D','D ')}</td>
                      <td style={{ textAlign:'center' }}><Cb checked={d.vaccine_type==='PVRV'} /></td>
                      <td style={{ textAlign:'center' }}><Cb checked={d.vaccine_type==='PCEC'} /></td>
                      <td style={{ fontSize:'7pt' }}>{d.brand_name||''}</td>
                      <td style={{ fontSize:'7pt' }}>{cleanBatchNo(pickDoseField(d, ['batch_no', 'Batch No.', 'Batch No', 'Batch / Lot Number']))||''}</td>
                      <td style={{ fontSize:'6.5pt' }}>{doseRoute(d)||''}</td>
                      <td style={{ fontSize:'6.5pt' }}>{doseAmount(d)||''}</td>
                      <td style={{ fontSize:'7pt' }}>{d.scheduled_date ? fullDate(d.scheduled_date) : ''}</td>
                      <td style={{ fontSize:'7pt', color: d.administered_date ? '#166534' : '#999' }}>{d.administered_date ? fullDate(d.administered_date) : '—'}</td>
                      <td style={{ fontSize:'7pt' }}>{getUserName(d.administered_by)}{getUserCred(d.administered_by) ? `, ${getUserCred(d.administered_by)}` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ padding:'2px 5px 1px' }}>
              <div style={{ fontSize:'7pt', fontWeight:'bold', marginBottom:2 }}>Booster Dose Schedule</div>
              <table>
                <thead><tr>
                  <th style={{ width:'8%', textAlign:'left', paddingLeft:4 }}>Dose</th>
                  <th style={{ width:'5%' }}>PVRV</th>
                  <th style={{ width:'5%' }}>PCEC</th>
                  <th style={{ width:'10%' }}>Brand</th>
                  <th style={{ width:'9%' }}>Batch</th>
                  <th style={{ width:'9%' }}>Route</th>
                  <th style={{ width:'7%' }}>Dose</th>
                  <th style={{ width:'15%' }}>Schedule Date</th>
                  <th style={{ width:'13%' }}>Date Given</th>
                  <th>Administered By</th>
                </tr></thead>
                <tbody>
                  {boosterRows.map((d: any, i: number) => (
                    <tr key={i} style={{ background: i%2===0 ? 'white' : '#f0f4ff' }}>
                      <td style={{ fontWeight:'bold', fontSize:'7.5pt', paddingLeft:4 }}>{d.dose_day.replace('D','D ')}</td>
                      <td style={{ textAlign:'center' }}><Cb checked={d.vaccine_type==='PVRV'} /></td>
                      <td style={{ textAlign:'center' }}><Cb checked={d.vaccine_type==='PCEC'} /></td>
                      <td style={{ fontSize:'7pt' }}>{d.brand_name||''}</td>
                      <td style={{ fontSize:'7pt' }}>{cleanBatchNo(pickDoseField(d, ['batch_no', 'Batch No.', 'Batch No', 'Batch / Lot Number']))||''}</td>
                      <td style={{ fontSize:'6.5pt' }}>{doseRoute(d)||''}</td>
                      <td style={{ fontSize:'6.5pt' }}>{doseAmount(d)||''}</td>
                      <td style={{ fontSize:'7pt' }}>{d.scheduled_date ? fullDate(d.scheduled_date) : ''}</td>
                      <td style={{ fontSize:'7pt', color: d.administered_date ? '#166534' : '#999' }}>{d.administered_date ? fullDate(d.administered_date) : '—'}</td>
                      <td style={{ fontSize:'7pt' }}>{getUserName(d.administered_by)}{getUserCred(d.administered_by) ? `, ${getUserCred(d.administered_by)}` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ padding:'2px 5px' }}>
              <table>
                <thead><tr>
                  <th style={{ width:'18%' }}>Anti-Rabies Immunoglobulin</th>
                  <th>Brand Name</th><th>Batch No.</th><th>Date</th><th>Administered By</th>
                </tr></thead>
                <tbody><tr>
                  <td><Cb checked={incident.erig_hrig==='ERIG'} /> ERIG &nbsp; <Cb checked={incident.erig_hrig==='HRIG'} /> HRIG</td>
                  <td style={{ fontSize:'7pt' }}>{incident.erig_hrig_brand||''}</td>
                  <td style={{ fontSize:'7pt' }}>{cleanBatchNo(incident.erig_hrig_batch)}</td>
                  <td style={{ fontSize:'7pt' }}>{fullDate(incident.erig_hrig_date)}</td>
                  <td style={{ fontSize:'7pt' }}>{
                    String(incident.erig_hrig_administered_by || '').startsWith('OTHER:')
                      ? String(incident.erig_hrig_administered_by).slice(6) || '(Other facility)'
                      : (getUserName(incident.erig_hrig_administered_by) + (getUserCred(incident.erig_hrig_administered_by) ? `, ${getUserCred(incident.erig_hrig_administered_by)}` : ''))
                  }</td>
                </tr></tbody>
              </table>
            </div>

            <div style={{ padding:'2px 5px 3px' }}>
              <table>
                <thead><tr>
                  <th style={{ width:'18%' }}>Tetanus Vaccine</th>
                  <th>Brand Name</th><th>Batch No.</th><th>Date</th><th>Administered By</th>
                </tr></thead>
                <tbody><tr>
                  <td>
                    <Cb checked={incident.tetanus_type==='TT'}  /> TT &nbsp;
                    <Cb checked={incident.tetanus_type==='TD'}  /> TD &nbsp;
                    <Cb checked={incident.tetanus_type==='ATS'} /> ATS
                    {incident.tetanus_units ? ` (${incident.tetanus_units})` : ''}
                  </td>
                  <td style={{ fontSize:'7pt' }}>{incident.tetanus_brand||''}</td>
                  <td style={{ fontSize:'7pt' }}>{cleanBatchNo(incident.tetanus_batch)}</td>
                  <td style={{ fontSize:'7pt' }}>{fullDate(incident.tetanus_date)}</td>
                  <td style={{ fontSize:'7pt' }}>{getUserName(incident.tetanus_admin_by)}{getUserCred(incident.tetanus_admin_by) ? `, ${getUserCred(incident.tetanus_admin_by)}` : ''}</td>
                </tr></tbody>
              </table>
            </div>
          </div>

          {/* VII. Refer If Needed — boxed, same size as Physician Notes */}
          <div className="section" style={{ marginBottom:4 }}>
            <div className="section-title" style={{padding:'1px 6px'}}>VII. Refer If Needed</div>
            <div style={{ padding:'3px 6px', minHeight:30, fontSize:'8pt', whiteSpace:'pre-wrap' }}>{incident.refer_if_needed||''}</div>
          </div>

          {/* Signatures */}
          <div className="sig-row">
            <div className="sig-block">
              <div style={{ minHeight:12 }} />
              <div>
                <strong>{getUserName(nurseId) || '________________________________'}</strong>
                {getUserCred(nurseId) ? `, ${getUserCred(nurseId)}` : ''}<br/>
                <span style={{ fontSize:'7pt' }}>Lic. No.: {getUserLic(nurseId) || '_______________'}</span>
                <div className="sig-line" />
                <strong style={{ fontSize:'7.5pt' }}>ABTC NURSE</strong>
              </div>
            </div>
            <div className="sig-block">
              <div style={{ minHeight:12 }} />
              <div>
                <strong>{getUserName(doctorId) || '________________________________'}</strong>
                {getUserCred(doctorId) ? `, ${getUserCred(doctorId)}` : ''}<br/>
                <span style={{ fontSize:'7pt' }}>Lic. No.: {getUserLic(doctorId) || '_______________'}</span>
                <div className="sig-line" />
                <strong style={{ fontSize:'7.5pt' }}>ABTC PHYSICIAN</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="footer">
          <div style={{ fontSize:'9pt', fontWeight:800, color:'#1d4ed8', letterSpacing:'.12em' }}>BETTER · GREATER · HAPPIER</div>
          <div style={{ fontSize:'12pt', fontWeight:900, color:'#1e3a8a', letterSpacing:'.15em' }}>RAGAY</div>
        </div>
      </div>
    </>
  );
}
