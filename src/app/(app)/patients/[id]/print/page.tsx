'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function PrintPage() {
  const router = useRouter();
  const { user, activeNurse, nurses, loadNurses, setActiveNurse } = useAuth();
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

  useEffect(() => {
    if (user?.role === 'admin' && nurses.length === 0) {
      loadNurses();
    }
  }, [user, nurses.length, loadNurses]);

  if (!data) return <div style={{ fontFamily:'Arial', padding:40, textAlign:'center' }}>Loading form…</div>;

  const { patient, incidents, doses } = data;
  const incident = incidents?.[incidents.length - 1] || {};
  const incDoses = (doses || []).filter((d: any) => d.incident_id === incident.incident_id);

  const fullDate = (d: string) => {
    if (!d) return '';
    // Strip time component to avoid timezone issues
    const clean = String(d).includes('T') ? d.split('T')[0] : d;
    if (!clean || clean === 'undefined') return '';
    return new Date(clean + 'T00:00:00').toLocaleDateString('en-PH', { month:'long', day:'numeric', year:'numeric' });
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

  const pepDoseDays = ['D0','D3','D7','D14','D28'];
  const prepDoseDays = ['D0','D7','D14','D28'];
  const pepDoses = incDoses.filter((d: any) => d.dose_type !== 'PrEP');
  const prepDoses = incDoses.filter((d: any) => d.dose_type === 'PrEP');
  const pepRows = pepDoseDays.map(day => pepDoses.find((d: any) => d.dose_day === day) || { dose_day: day, vaccine_type:'', brand_name:'', batch_no:'', administered_date:'', administered_by:'', scheduled_date:'' });
  const prepRows = prepDoseDays.map(day => prepDoses.find((d: any) => d.dose_day === day) || { dose_day: day, vaccine_type:'', brand_name:'', batch_no:'', administered_date:'', administered_by:'', scheduled_date:'' });

  const nurseId = activeNurse?.user_id || incDoses.find((d: any) => d.administered_by)?.administered_by || '';
  const doctorId = incident.referring_doctor || '';

  // Percentage positions [left%, top%] on the anatomical image (front left half, back right half)
  const BODY_SITE_COORDS: Record<string, [number,number]> = {
    'Head':       [23, 6],
    'Face':       [23, 9],
    'Neck':       [23, 14],
    'Chest':      [23, 28],
    'Abdomen':    [23, 40],
    'R.Arm':      [12, 30],
    'L.Arm':      [34, 30],
    'R.Hand':     [9,  48],
    'L.Hand':     [37, 48],
    'R.Leg':      [18, 62],
    'L.Leg':      [27, 62],
    'R.Foot':     [18, 90],
    'L.Foot':     [27, 90],
    'Upper Back': [73, 22],
    'Lower Back': [73, 37],
    'Genitalia':  [23, 52],
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
        @media print { .screen-controls { display: none !important; } .print-btn { display: none; } }
      `}</style>

      <div className="screen-controls" style={{ position:'fixed', top:16, left:16, right:16, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, zIndex:1000 }}>
        <div style={{ display:'flex', gap:8, alignItems:'center', background:'rgba(255,255,255,.96)', padding:'8px 10px', borderRadius:10, boxShadow:'0 4px 14px rgba(0,0,0,.12)' }}>
          <button className="print-btn" onClick={() => router.back()} style={{ position:'static', background:'#475569', boxShadow:'none', padding:'8px 16px' }}>← Back</button>
          {user?.role === 'admin' && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:13, fontWeight:700, color:'#334155' }}>Nurse</span>
              <select
                value={activeNurse?.user_id || ''}
                onChange={e => {
                  const nurse = nurses.find(n => n.user_id === e.target.value);
                  if (nurse) setActiveNurse(nurse);
                }}
                style={{ padding:'8px 10px', borderRadius:8, border:'1px solid #cbd5e1', fontSize:13, minWidth:220 }}
              >
                <option value="">Select active nurse</option>
                {nurses.map(n => (
                  <option key={n.user_id} value={n.user_id}>
                    {n.full_name}{n.credential ? `, ${n.credential}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <button className="print-btn" onClick={() => window.print()} style={{ position:'static', boxShadow:'0 4px 12px rgba(29,78,216,.4)' }}>🖨 Print</button>
      </div>

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
              <div style={{ border:'1px solid #aaa', padding:4, marginTop:3, background:'#fff' }}>
                {/* Anatomical position image - front and back */}
                <div style={{ position:'relative', display:'inline-block', width:'100%', background:'#fff' }}>
                  <img src="/logos/anatomical.png" alt="Anatomical Position"
                    style={{ width:'100%', maxHeight:160, objectFit:'contain', display:'block', background:'#fff' }} />
                </div>
                <div style={{ fontSize:'7.5pt', marginTop:3 }}>
                  <strong>Marked:</strong> {anatomicalSites.length > 0 ? anatomicalSites.join(', ') : '—'}
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

          {/* Anti-Rabies Vaccine */}
          <div style={{ padding:'3px 5px 2px' }}>
            <div style={{ fontSize:'7.5pt', fontWeight:'bold', marginBottom:4 }}>PEP Schedule Date</div>
            <table>
              <thead>
                <tr>
                  <th style={{ width:'18%', textAlign:'left', paddingLeft:4 }}>Dose</th>
                  <th style={{ width:'9%' }}>PVRV</th>
                  <th style={{ width:'9%' }}>PCEC</th>
                  <th style={{ width:'22%' }}>Schedule Date</th>
                  <th style={{ width:'20%' }}>Date Given</th>
                  <th>Administered By</th>
                </tr>
              </thead>
              <tbody>
                {pepRows.map((d: any, i: number) => (
                  <tr key={i} style={{ background: i%2===0 ? 'white' : '#f0f4ff' }}>
                    <td style={{ fontWeight:'bold', fontSize:'8pt', paddingLeft:4 }}>
                      {d.dose_day === 'D28' ? 'D 28/30' : d.dose_day.replace('D','D ')}
                    </td>
                    <td style={{ textAlign:'center' }}><Cb checked={d.vaccine_type==='PVRV'} /></td>
                    <td style={{ textAlign:'center' }}><Cb checked={d.vaccine_type==='PCEC'} /></td>
                    <td style={{ fontSize:'7pt' }}>{d.scheduled_date ? fullDate(d.scheduled_date) : ''}</td>
                    <td style={{ fontSize:'7pt', color: d.administered_date ? '#166534' : '#999' }}>
                      {d.administered_date ? fullDate(d.administered_date) : '—'}
                    </td>
                    <td style={{ fontSize:'7pt' }}>
                      {getUserName(d.administered_by)}{getUserCred(d.administered_by) ? `, ${getUserCred(d.administered_by)}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding:'2px 5px 4px' }}>
            <div style={{ fontSize:'7.5pt', fontWeight:'bold', marginBottom:4 }}>PrEP Schedule Date</div>
            <table>
              <thead>
                <tr>
                  <th style={{ width:'18%', textAlign:'left', paddingLeft:4 }}>Dose</th>
                  <th style={{ width:'9%' }}>PVRV</th>
                  <th style={{ width:'9%' }}>PCEC</th>
                  <th style={{ width:'22%' }}>Schedule Date</th>
                  <th style={{ width:'20%' }}>Date Given</th>
                  <th>Administered By</th>
                </tr>
              </thead>
              <tbody>
                {prepRows.map((d: any, i: number) => (
                  <tr key={i} style={{ background: i%2===0 ? 'white' : '#f0f4ff' }}>
                    <td style={{ fontWeight:'bold', fontSize:'8pt', paddingLeft:4 }}>
                      {d.dose_day === 'D28' ? 'D 28/30' : d.dose_day.replace('D','D ')}
                    </td>
                    <td style={{ textAlign:'center' }}><Cb checked={d.vaccine_type==='PVRV'} /></td>
                    <td style={{ textAlign:'center' }}><Cb checked={d.vaccine_type==='PCEC'} /></td>
                    <td style={{ fontSize:'7pt' }}>{d.scheduled_date ? fullDate(d.scheduled_date) : ''}</td>
                    <td style={{ fontSize:'7pt', color: d.administered_date ? '#166534' : '#999' }}>
                      {d.administered_date ? fullDate(d.administered_date) : '—'}
                    </td>
                    <td style={{ fontSize:'7pt' }}>
                      {getUserName(d.administered_by)}{getUserCred(d.administered_by) ? `, ${getUserCred(d.administered_by)}` : ''}
                    </td>
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
                  {incident.tetanus_units ? ` (${incident.tetanus_units})` : ''}
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
            <div>
              <strong>{getUserName(nurseId) || '________________________________'}</strong>
              {getUserCred(nurseId) ? `, ${getUserCred(nurseId)}` : ''}<br/>
              <span style={{ fontSize:'7.5pt' }}>Lic. No.: {getUserLic(nurseId) || '_______________'}</span>
              <div className="sig-line" />
              <strong style={{ fontSize:'8pt' }}>ABTC NURSE</strong>
            </div>
          </div>
          <div className="sig-block">
            <div style={{ minHeight:28 }} />
            <div>
              <strong>{getUserName(doctorId) || '________________________________'}</strong>
              {getUserCred(doctorId) ? `, ${getUserCred(doctorId)}` : ''}<br/>
              <span style={{ fontSize:'7.5pt' }}>Lic. No.: {getUserLic(doctorId) || '_______________'}</span>
              <div className="sig-line" />
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
