'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

export default function PrintPage() {
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
  const incDoses = (doses || []).filter((d: any) => d.incident_id === incident.incident_id && d.dose_type === 'PEP');

  const fullDate = (d: string) => d ? new Date(d).toLocaleDateString('en-PH', { month:'long', day:'numeric', year:'numeric' }) : '';
  const fmtDateTime = (d: string) => d ? new Date(d).toLocaleString('en-PH', { month:'long', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '';

  const Cb = ({ checked }: { checked?: boolean }) => (
    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:12, height:12, border:'1px solid #333', marginRight:3, fontSize:9, verticalAlign:'middle', flexShrink:0 }}>
      {checked ? '✓' : ''}
    </span>
  );
  const Radio = ({ val, current, label }: { val:string; current:string; label:string }) => (
    <span style={{ marginRight:14, whiteSpace:'nowrap' }}><Cb checked={current === val} /> {label}</span>
  );

  const getUserName = (id: string) => {
    if (!id) return '';
    const u = allUsers[id];
    return u ? u.full_name : '';
  };
  const getUserCred = (id: string) => {
    if (!id) return '';
    const u = allUsers[id];
    return u ? (u.credential || '') : '';
  };
  const getUserLic = (id: string) => {
    if (!id) return '';
    const u = allUsers[id];
    return u ? (u.license_no || '') : '';
  };

  const anatomicalSites: string[] = (() => { try { return JSON.parse(incident.anatomical_positions || '[]'); } catch { return []; }})();

  // Build 5 dose rows — one per PEP dose
  const dayKeys = ['D0','D3','D7','D14','D28'];
  const doseRows = dayKeys.map(day => incDoses.find((d: any) => d.dose_day === day) || { dose_day: day, vaccine_type:'', brand_name:'', batch_no:'', administered_date:'', administered_by:'' });

  // Scheduled dates for display
  const doseDateMap: Record<string,string> = {};
  incDoses.forEach((d: any) => { doseDateMap[d.dose_day] = d.scheduled_date || ''; });

  const nurseId = incDoses.find((d: any) => d.administered_by)?.administered_by || '';
  const doctorId = incident.referring_doctor || '';

  const BODY_SITE_COORDS: Record<string, [number,number]> = {
    'Head': [70,14], 'Neck': [70,32], 'R.Arm': [44,62], 'L.Arm': [96,62],
    'R.Hand': [36,92], 'L.Hand': [104,92], 'Chest': [70,54], 'Abdomen': [70,72],
    'Upper Back': [70,54], 'Lower Back': [70,68],
    'R.Leg': [56,108], 'L.Leg': [84,108], 'R.Foot': [54,138], 'L.Foot': [86,138],
  };

  return (
    <>
      <style>{`
        @page { size: A4; margin: 12mm 12mm 12mm 12mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 8.5pt; color: #000; background: white; margin: 0; }
        .page { width: 100%; page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        .section { border: 1px solid #333; margin-bottom: 5px; }
        .section-title { background: #dce8f5; border-bottom: 1px solid #333; padding: 2px 6px; font-weight: bold; font-size: 8.5pt; }
        .section-body { padding: 4px 6px; }
        .row { display: flex; gap: 8px; align-items: baseline; margin-bottom: 3px; flex-wrap: wrap; }
        .lbl { font-weight: bold; white-space: nowrap; }
        .val { flex: 1; border-bottom: 1px solid #555; min-width: 60px; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; }
        .col { padding: 4px 6px; }
        .col+.col { border-left: 1px solid #333; }
        table { width: 100%; border-collapse: collapse; font-size: 7.5pt; }
        th, td { border: 1px solid #333; padding: 2px 3px; vertical-align: middle; }
        th { background: #dce8f5; font-weight: bold; text-align: center; }
        .sig-row { display: flex; justify-content: space-between; margin-top: 16px; gap: 20px; }
        .sig-block { text-align: center; flex: 1; }
        .sig-line { border-top: 1.5px solid #333; padding-top: 3px; }
        @media screen {
          body { background: #ccc; }
          .page { background: white; max-width: 210mm; margin: 16px auto; padding: 12mm; box-shadow: 0 2px 16px rgba(0,0,0,.2); }
          .print-btn { position: fixed; top: 16px; right: 16px; padding: 9px 20px; background: #1d4ed8; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 700; z-index: 999; box-shadow: 0 4px 12px rgba(29,78,216,.4); }
        }
        @media print { .print-btn { display: none; } }
      `}</style>

      <button className="print-btn" onClick={() => window.print()}>🖨 Print</button>

      {/* ===== PAGE 1 ===== */}
      <div className="page">

        {/* Header with logos */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginBottom:6, paddingBottom:6, borderBottom:'2px solid #1d4ed8' }}>
          <img src="/logos/bagong_pilipinas.jpg" alt="" style={{ width:50, height:50, objectFit:'contain' }} />
          <img src="/logos/lgu_logo.jpg" alt="" style={{ width:50, height:50, objectFit:'contain' }} />
          <div style={{ textAlign:'center', flex:1 }}>
            <div style={{ fontSize:'13pt', fontWeight:900, letterSpacing:'.02em', color:'#1e3a8a' }}>RAGAY ANIMAL BITE TREATMENT CENTER</div>
            <div style={{ fontSize:'8.5pt', marginTop:1 }}>Poblacion, Ragay, Camarines Sur</div>
            <div style={{ fontSize:'8.5pt' }}>Municipal Health Office</div>
          </div>
          <img src="/logos/rhu_logo.png" alt="" style={{ width:50, height:50, objectFit:'contain' }} />
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
          <span><span className="lbl">Date of Consultation:</span> <span style={{ borderBottom:'1px solid #333', display:'inline-block', minWidth:160, paddingRight:8 }}>{fullDate(incident.consult_date) || fullDate(new Date().toISOString())}</span></span>
          <span><span className="lbl">Patient ID No.:</span> <span style={{ fontFamily:'monospace', fontWeight:900, fontSize:'9pt', borderBottom:'1px solid #333', display:'inline-block', minWidth:100 }}>{patient.patient_id}</span></span>
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
              <div style={{ marginTop:3 }}>
                <span className="lbl">C. Type of Exposure: </span>
                <Radio val="dog" current={incident.animal_type||''} label="Dog" />
                <Radio val="cat" current={incident.animal_type||''} label="Cat" />
                <Radio val="bat" current={incident.animal_type||''} label="Bat" />
                <Radio val="other" current={incident.animal_type||''} label={`Others: ${incident.animal_other||'_______'}`} />
              </div>
              <div style={{ marginTop:5 }}>
                <span className="lbl">E. Circumstance: </span>
                <Radio val="provoked" current={incident.circumstance||''} label="Provoked" />
                <Radio val="unprovoked" current={incident.circumstance||''} label="Unprovoked" />
              </div>
            </div>
            <div className="col">
              <div style={{ marginBottom:3 }}><span className="lbl">D. Ownership:</span></div>
              <div><Cb checked={incident.ownership==='owned_vaccinated'} /> Owned/Vaccinated &nbsp; (Date: <span style={{ borderBottom:'1px solid #333', display:'inline-block', minWidth:70 }}>{fullDate(incident.pet_vaccine_date)}</span>)</div>
              <div style={{ marginTop:3 }}><Cb checked={incident.ownership==='owned_not_vaccinated'} /> Owned / Not Vaccinated</div>
              <div style={{ marginTop:3 }}><Cb checked={incident.ownership==='stray'} /> Stray</div>
              <div style={{ marginTop:3 }}><Cb checked={incident.ownership==='wild_rabid'} /> Wild / Rabid</div>
            </div>
          </div>
        </div>

        {/* Section III */}
        <div className="section">
          <div className="section-title">III. Wound Description / Wound Care</div>
          <div className="two-col">
            {/* Left */}
            <div className="col">
              <strong style={{ fontSize:'8pt' }}>A. Anatomical Position</strong>
              <div style={{ border:'1px solid #aaa', padding:6, marginTop:3, display:'flex', gap:8, alignItems:'flex-start' }}>
                {/* Realistic human body SVG */}
                <svg width="120" height="160" viewBox="0 0 120 160" style={{ flexShrink:0 }}>
                  {/* Head */}
                  <ellipse cx="60" cy="16" rx="12" ry="14" fill="none" stroke="#333" strokeWidth="1.2"/>
                  {/* Neck */}
                  <rect x="55" y="29" width="10" height="10" rx="2" fill="none" stroke="#333" strokeWidth="1"/>
                  {/* Torso */}
                  <path d="M38 39 Q35 42 34 60 Q33 75 36 88 L84 88 Q87 75 86 60 Q85 42 82 39 Q72 36 60 36 Q48 36 38 39Z" fill="none" stroke="#333" strokeWidth="1.2"/>
                  {/* Shoulders line */}
                  <line x1="38" y1="42" x2="82" y2="42" stroke="#333" strokeWidth=".5" strokeDasharray="2,2"/>
                  {/* Chest detail */}
                  <path d="M47 50 Q60 55 73 50" fill="none" stroke="#aaa" strokeWidth=".8"/>
                  {/* Belly button */}
                  <circle cx="60" cy="78" r="1.5" fill="#aaa"/>
                  {/* Left upper arm */}
                  <path d="M38 42 Q28 48 24 65" fill="none" stroke="#333" strokeWidth="1.2"/>
                  {/* Left forearm */}
                  <path d="M24 65 Q20 80 18 94" fill="none" stroke="#333" strokeWidth="1.1"/>
                  {/* Left hand */}
                  <ellipse cx="17" cy="98" rx="5" ry="6" fill="none" stroke="#333" strokeWidth="1"/>
                  {/* Right upper arm */}
                  <path d="M82 42 Q92 48 96 65" fill="none" stroke="#333" strokeWidth="1.2"/>
                  {/* Right forearm */}
                  <path d="M96 65 Q100 80 102 94" fill="none" stroke="#333" strokeWidth="1.1"/>
                  {/* Right hand */}
                  <ellipse cx="103" cy="98" rx="5" ry="6" fill="none" stroke="#333" strokeWidth="1"/>
                  {/* Left thigh */}
                  <path d="M44 88 Q40 105 39 122" fill="none" stroke="#333" strokeWidth="1.2"/>
                  {/* Left shin */}
                  <path d="M39 122 Q38 136 38 148" fill="none" stroke="#333" strokeWidth="1.1"/>
                  {/* Left foot */}
                  <ellipse cx="38" cy="153" rx="7" ry="4" fill="none" stroke="#333" strokeWidth="1"/>
                  {/* Right thigh */}
                  <path d="M76 88 Q80 105 81 122" fill="none" stroke="#333" strokeWidth="1.2"/>
                  {/* Right shin */}
                  <path d="M81 122 Q82 136 82 148" fill="none" stroke="#333" strokeWidth="1.1"/>
                  {/* Right foot */}
                  <ellipse cx="82" cy="153" rx="7" ry="4" fill="none" stroke="#333" strokeWidth="1"/>
                  {/* Highlight marked sites */}
                  {anatomicalSites.map(site => {
                    const coords = BODY_SITE_COORDS[site];
                    if (!coords) return null;
                    return <circle key={site} cx={coords[0]} cy={coords[1]} r="6" fill="rgba(220,0,0,.25)" stroke="#cc0000" strokeWidth="1.2"/>;
                  })}
                  {/* Labels */}
                  <text x="60" y="157" textAnchor="middle" fontSize="6" fill="#666">Front view</text>
                </svg>
                <div style={{ fontSize:'7.5pt', flex:1 }}>
                  <strong>Marked sites:</strong><br/>
                  {anatomicalSites.length > 0 ? anatomicalSites.join(', ') : '—'}
                </div>
              </div>
              <div style={{ marginTop:5 }}>
                <strong style={{ fontSize:'8pt' }}>E. Wound Care</strong>
                <div style={{ marginTop:3, lineHeight:1.8 }}>
                  <div>e1. Wound Wash with soap and water: &nbsp; <Cb checked={incident.wound_wash===true||incident.wound_wash==='true'} /> Y &nbsp; <Cb checked={incident.wound_wash===false||incident.wound_wash==='false'} /> N</div>
                  <div>e2. Antiseptic Applied (Povidone/Alcohol): &nbsp; <Cb checked={incident.antiseptic_applied===true||incident.antiseptic_applied==='true'} /> Y &nbsp; <Cb checked={incident.antiseptic_applied===false||incident.antiseptic_applied==='false'} /> N</div>
                </div>
              </div>
            </div>
            {/* Right */}
            <div className="col">
              <div style={{ marginBottom:5 }}>
                <strong style={{ fontSize:'8pt' }}>B. Wound Status: &nbsp;</strong>
                <Cb checked={incident.wound_status==='bleeding'} /> Bleeding &nbsp;&nbsp;
                <Cb checked={incident.wound_status==='non_bleeding'} /> Non-Bleeding
              </div>
              <div style={{ marginBottom:5, lineHeight:1.65 }}>
                <strong style={{ fontSize:'8pt' }}>C. Wound Category:</strong>
                <div style={{ marginTop:2 }}>
                  <div><Cb checked={incident.wound_category==='I'} /> <strong>Category I:</strong> Touching/feeding animals, licks on intact skin, contact of intact skin with secretions.</div>
                  <div style={{ marginTop:3 }}><Cb checked={incident.wound_category==='II'} /> <strong>Category II:</strong> Nibbling of uncovered skin, minor scratches or abrasions without bleeding.</div>
                  <div style={{ marginTop:3 }}><Cb checked={incident.wound_category==='III'} /> <strong>Category III:</strong> Transdermal bites/scratches, licks on broken skin, contamination of mucous membrane, exposure to bats.</div>
                </div>
              </div>
              <div style={{ lineHeight:1.8 }}>
                <strong style={{ fontSize:'8pt' }}>D. Type of Wound:</strong>
                {[
                  { val:'superficial', label:'Superficial Scratches' },
                  { val:'abrasion', label:'Abrasion' },
                  { val:'transdermal', label:'Multiple transdermal bites/scratches' },
                  { val:'lick', label:'Lick' },
                  { val:'mucus', label:'Contamination of Mucus Membrane' },
                  { val:'other', label:`Others: ${incident.wound_type_other||'___________'}` },
                ].map(o => (
                  <div key={o.val}><Cb checked={incident.wound_type===o.val} /> {o.label}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Page 1 footer */}
        <div style={{ textAlign:'center', marginTop:10, paddingTop:6, borderTop:'1.5px solid #1d4ed8' }}>
          <div style={{ fontSize:'10pt', fontWeight:800, color:'#1d4ed8', letterSpacing:'.12em' }}>BETTER · GREATER · HAPPIER</div>
          <div style={{ fontSize:'13pt', fontWeight:900, color:'#1e3a8a', letterSpacing:'.15em' }}>RAGAY</div>
        </div>
      </div>

      {/* ===== PAGE 2 ===== */}
      <div className="page">

        {/* Compact page 2 header */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, paddingBottom:5, borderBottom:'2px solid #1d4ed8' }}>
          <div style={{ textAlign:'center', flex:1 }}>
            <div style={{ fontSize:'11pt', fontWeight:900, color:'#1e3a8a' }}>RAGAY ANIMAL BITE TREATMENT CENTER</div>
            <div style={{ fontSize:'7.5pt' }}>Poblacion, Ragay, Camarines Sur · Municipal Health Office</div>
          </div>
        </div>

        {/* Section IV */}
        <div className="section">
          <div className="section-title">IV. History</div>
          <div className="section-body">
            <div style={{ marginBottom:3 }}><strong>A. Other Medical Conditions/On Treatment:</strong></div>
            <div style={{ lineHeight:1.8 }}>
              <Cb checked={incident.hiv} /> H.I.V. &nbsp;
              <Cb checked={incident.immunosuppressant} /> Immunosuppressant Agent &nbsp;
              <Cb checked={incident.long_term_steroid} /> Long-Term Steroid &nbsp;
              <Cb checked={incident.chloroquine} /> Chloroquine &nbsp;
              <Cb checked={incident.malignancy} /> Treatment for Malignancy &nbsp;
              <Cb checked={incident.congenital_immuno} /> Congenital Immuno-deficiency
              <div>Others: <span style={{ borderBottom:'1px solid #333', display:'inline-block', minWidth:220 }}>{incident.other_conditions||''}</span></div>
            </div>
            <div style={{ marginTop:4, lineHeight:1.9 }}>
              <div><strong>B. Anti-Tetanus Vaccine:</strong> &nbsp; <Cb checked={incident.anti_tetanus_vaccine===true||incident.anti_tetanus_vaccine==='true'} /> Y &nbsp; <Cb checked={incident.anti_tetanus_vaccine===false||incident.anti_tetanus_vaccine==='false'} /> N &nbsp; {incident.anti_tetanus_vaccine ? `If yes: ${fullDate(incident.tetanus_date)||'____________'}` : ''}</div>
              <div><strong>C. Completed anti-rabies shots:</strong> &nbsp; <Cb checked={incident.anti_rabies_completed} /> Y &nbsp; <Cb checked={!incident.anti_rabies_completed} /> N &nbsp; {incident.anti_rabies_details ? `(${incident.anti_rabies_details})` : ''}</div>
              <div><strong>D. Consulted traditional/folk healers:</strong> &nbsp; <Cb checked={incident.folk_remedy} /> Y &nbsp; <Cb checked={!incident.folk_remedy} /> N &nbsp; {incident.folk_remedy_details||''}</div>
              <div><strong>E.</strong> &nbsp; <Cb checked={incident.smoker} /> Smoker &nbsp;&nbsp; <Cb checked={incident.alcoholic} /> Alcoholic Drinker</div>
            </div>
          </div>
        </div>

        {/* Section V */}
        <div className="section">
          <div className="section-title">V. Physician's Order / Notes</div>
          <div style={{ padding:4, minHeight:56, fontSize:'8.5pt', whiteSpace:'pre-wrap' }}>{incident.physician_notes||''}</div>
        </div>

        {/* Section VI */}
        <div className="section">
          <div className="section-title">VI. Treatment</div>

          {/* Anti-Rabies Vaccine (PVRV/PCEC) — 5 rows */}
          <div style={{ padding:'3px 5px 2px' }}>
            <table>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width:'9%' }}>Generic Name</th>
                  <th rowSpan={2} style={{ width:'12%' }}>Brand Name</th>
                  <th rowSpan={2} style={{ width:'10%' }}>Batch No.</th>
                  <th colSpan={5}>PEP Dose</th>
                  <th rowSpan={2} style={{ width:'12%' }}>Administered By</th>
                </tr>
                <tr>
                  {dayKeys.map(day => {
                    const schedDate = doseDateMap[day] ? fullDate(doseDateMap[day]) : '';
                    return (
                      <th key={day} style={{ fontSize:'6pt', width:'11%' }}>
                        {day.replace('D','D ')}<br/>
                        <span style={{ fontWeight:'normal', fontSize:'5.5pt' }}>{schedDate||'—'}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {doseRows.map((d: any, i: number) => (
                  <tr key={i} style={{ background: i%2===0 ? 'white' : '#f8fafc' }}>
                    <td style={{ fontSize:'7.5pt' }}>
                      <Cb checked={d.vaccine_type==='PVRV'} /> PVRV<br/>
                      <Cb checked={d.vaccine_type==='PCEC'} /> PCEC
                    </td>
                    <td style={{ fontSize:'7.5pt' }}>{d.brand_name||''}</td>
                    <td style={{ fontSize:'7.5pt' }}>{d.batch_no||''}</td>
                    {dayKeys.map(day => {
                      const thisDose = incDoses.find((dd: any) => dd.dose_day === day);
                      return (
                        <td key={day} style={{ textAlign:'center', fontSize:'7pt' }}>
                          {thisDose?.administered_date && day === d.dose_day ? '✓' : ''}
                        </td>
                      );
                    })}
                    <td style={{ fontSize:'7pt' }}>{getUserName(d.administered_by)}{getUserCred(d.administered_by) ? `, ${getUserCred(d.administered_by)}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ERIG/HRIG */}
          <div style={{ padding:'2px 5px' }}>
            <table>
              <thead><tr>
                <th style={{ width:'18%' }}>Anti-Rabies Immunoglobulin</th>
                <th>Brand Name</th><th>Batch No.</th><th>Date</th><th>Administered By</th>
              </tr></thead>
              <tbody><tr>
                <td>
                  <Cb checked={incident.erig_hrig==='ERIG'} /> ERIG &nbsp;
                  <Cb checked={incident.erig_hrig==='HRIG'} /> HRIG
                </td>
                <td style={{ fontSize:'7.5pt' }}>{incident.erig_hrig_brand||''}</td>
                <td style={{ fontSize:'7.5pt' }}>{incident.erig_hrig_batch||''}</td>
                <td style={{ fontSize:'7.5pt' }}>{fullDate(incident.erig_hrig_date)}</td>
                <td style={{ fontSize:'7.5pt' }}>{getUserName(incident.erig_hrig_administered_by)}{getUserCred(incident.erig_hrig_administered_by) ? `, ${getUserCred(incident.erig_hrig_administered_by)}` : ''}</td>
              </tr></tbody>
            </table>
          </div>

          {/* Tetanus */}
          <div style={{ padding:'2px 5px 4px' }}>
            <table>
              <thead><tr>
                <th style={{ width:'18%' }}>Tetanus Vaccine</th>
                <th>Brand Name</th><th>Batch No.</th><th>Date</th><th>Administered By</th>
              </tr></thead>
              <tbody><tr>
                <td>
                  <Cb checked={incident.tetanus_type==='TT'} /> TT &nbsp;
                  <Cb checked={incident.tetanus_type==='TD'} /> TD &nbsp;
                  <Cb checked={incident.tetanus_type==='ATS'} /> ATS
                </td>
                <td style={{ fontSize:'7.5pt' }}>{incident.tetanus_brand||''}</td>
                <td style={{ fontSize:'7.5pt' }}>{incident.tetanus_batch||''}</td>
                <td style={{ fontSize:'7.5pt' }}>{fullDate(incident.tetanus_date)}</td>
                <td style={{ fontSize:'7.5pt' }}>{getUserName(incident.tetanus_admin_by)}{getUserCred(incident.tetanus_admin_by) ? `, ${getUserCred(incident.tetanus_admin_by)}` : ''}</td>
              </tr></tbody>
            </table>
          </div>
        </div>

        {/* Section VII */}
        <div style={{ fontSize:'8.5pt', marginBottom:10 }}>
          <strong>VII. Refer If Needed:</strong>
        </div>

        {/* Signatures */}
        <div className="sig-row">
          <div className="sig-block">
            <div style={{ minHeight:28 }} />
            <div className="sig-line">
              <strong>{getUserName(nurseId) || '________________________________'}</strong>
              {getUserCred(nurseId) ? `, ${getUserCred(nurseId)}` : ''}<br/>
              <span style={{ fontSize:'7.5pt' }}>Lic. No.: {getUserLic(nurseId) || '_______________'}</span><br/>
              <strong style={{ fontSize:'8pt' }}>ABTC NURSE</strong>
            </div>
          </div>
          <div className="sig-block">
            <div style={{ minHeight:28 }} />
            <div className="sig-line">
              <strong>{getUserName(doctorId) || '________________________________'}</strong>
              {getUserCred(doctorId) ? `, ${getUserCred(doctorId)}` : ''}<br/>
              <span style={{ fontSize:'7.5pt' }}>Lic. No.: {getUserLic(doctorId) || '_______________'}</span><br/>
              <strong style={{ fontSize:'8pt' }}>ABTC PHYSICIAN</strong>
            </div>
          </div>
        </div>

        {/* Page 2 footer */}
        <div style={{ textAlign:'center', marginTop:12, paddingTop:6, borderTop:'1.5px solid #1d4ed8' }}>
          <div style={{ fontSize:'9pt', fontWeight:800, color:'#1d4ed8', letterSpacing:'.12em' }}>BETTER · GREATER · HAPPIER</div>
          <div style={{ fontSize:'12pt', fontWeight:900, color:'#1e3a8a', letterSpacing:'.15em' }}>RAGAY</div>
        </div>
      </div>
    </>
  );
}
