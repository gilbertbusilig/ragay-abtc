'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

export default function PrintPage() {
  const params = useParams();
  const patient_id = params.id as string;
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.getPatient(patient_id).then(res => {
      if (res.status === 'ok') setData(res.data);
    });
  }, [patient_id]);

  if (!data) return <div style={{ fontFamily:'Arial', padding:40 }}>Loading…</div>;

  const { patient, incidents, doses } = data;
  const incident = incidents?.[incidents.length - 1] || {};
  const incDoses = doses?.filter((d: any) => d.incident_id === incident.incident_id) || [];

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' }) : '';
  const Cb = ({ checked }: { checked?: boolean }) => (
    <span style={{ display:'inline-block', width:12, height:12, border:'1px solid #333', marginRight:3, textAlign:'center', lineHeight:'11px', fontSize:10, verticalAlign:'middle' }}>{checked ? '✓' : ''}</span>
  );
  const Radio = ({ val, current, label }: { val:string; current:string; label:string }) => (
    <span style={{ marginRight:12 }}><Cb checked={current === val} /> {label}</span>
  );

  const anatomicalSites: string[] = (() => { try { return JSON.parse(incident.anatomical_positions || '[]'); } catch { return []; }})();

  const pepDoses = incDoses.filter((d: any) => d.dose_type === 'PEP');

  return (
    <>
      <style>{`
        @page { size: A4; margin: 12.7mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 9pt; color: #000; background: white; margin: 0; }
        .page { width: 100%; page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        h2 { font-size: 11pt; text-align: center; margin: 0 0 2px; }
        h3 { font-size: 9pt; text-align: center; margin: 0 0 8px; font-weight: normal; }
        .logo-row { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 6px; }
        .section { border: 1px solid #333; margin-bottom: 6px; }
        .section-title { background: #e8e8e8; border-bottom: 1px solid #333; padding: 2px 6px; font-weight: bold; font-size: 9pt; }
        .section-body { padding: 4px 6px; }
        .field-row { display: flex; gap: 12px; align-items: baseline; margin-bottom: 3px; flex-wrap: wrap; }
        .field-label { font-weight: bold; white-space: nowrap; }
        .field-val { flex: 1; border-bottom: 1px solid #666; min-width: 80px; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
        .col { padding: 4px 6px; }
        .col + .col { border-left: 1px solid #333; }
        table { width: 100%; border-collapse: collapse; font-size: 8pt; }
        th, td { border: 1px solid #333; padding: 2px 4px; }
        th { background: #e8e8e8; font-weight: bold; text-align: center; }
        .quote { text-align: center; font-size: 8pt; color: #555; margin-top: 8px; font-style: italic; }
        .sig-row { display: flex; justify-content: space-between; margin-top: 20px; }
        .sig-block { text-align: center; width: 45%; }
        .sig-line { border-top: 1px solid #333; padding-top: 2px; font-weight: bold; }
        .wound-grid { display: flex; flex-wrap: wrap; gap: 3px; }
        .wound-box { border: 1px solid #999; padding: 1px 5px; font-size: 8pt; }
        .wound-box.hit { border-color: #cc0000; background: #ffe8e8; }
        @media screen {
          body { background: #e0e0e0; }
          .page { background: white; max-width: 210mm; margin: 20px auto; padding: 12.7mm; box-shadow: 0 2px 20px rgba(0,0,0,.2); }
          .print-btn { position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #0d9488; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; z-index: 999; }
        }
        @media print { .print-btn { display: none; } }
      `}</style>

      <button className="print-btn" onClick={() => window.print()}>🖨 Print</button>

      {/* ===== PAGE 1 ===== */}
      <div className="page">
        {/* Header */}
        <div className="logo-row">
          <img src="/logos/bagong_pilipinas.jpg" alt="Bagong Pilipinas" style={{ width:52, height:52, objectFit:'contain' }} />
          <img src="/logos/lgu_logo.jpg" alt="LGU Ragay" style={{ width:52, height:52, objectFit:'contain' }} />
          <div style={{ textAlign:'center', flex:1 }}>
            <h2>RAGAY ANIMAL BITE TREATMENT CENTER</h2>
            <h3>Población, Ragay, Camarines Sur · Municipal Health Office</h3>
          </div>
          <img src="/logos/rhu_logo.png" alt="RHU" style={{ width:52, height:52, objectFit:'contain' }} />
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:'9pt' }}>
          <span><span className="field-label">Date of Consultation:</span> <span style={{ borderBottom:'1px solid #333', paddingRight:60 }}>{formatDate(incident.consult_date) || new Date().toLocaleDateString('en-PH')}</span></span>
          <span><span className="field-label">Patient ID No.:</span> <span style={{ borderBottom:'1px solid #333', paddingRight:40, fontFamily:'monospace', fontWeight:700 }}>{patient.patient_id}</span></span>
        </div>

        {/* Section I */}
        <div className="section">
          <div className="section-title">I. Patient Information</div>
          <div className="section-body">
            <div className="field-row">
              <span className="field-label">A. Patient's Full Name:</span>
              <span className="field-val">{patient.full_name}</span>
              <span className="field-label">D. Sex:</span>
              <span><Cb checked={patient.sex==='M'} /> M</span>
              <span><Cb checked={patient.sex==='F'} /> F</span>
              <span className="field-label" style={{ marginLeft:12 }}>G. Contact No.:</span>
              <span className="field-val">{patient.contact_no}</span>
            </div>
            <div className="field-row">
              <span className="field-label">B. Address:</span>
              <span className="field-val" style={{ flex:3 }}>{patient.address}</span>
              <span className="field-label">E. Age:</span>
              <span className="field-val">{patient.age}</span>
            </div>
            <div className="field-row">
              <span className="field-label">C. Date of Birth:</span>
              <span className="field-val">{formatDate(patient.date_of_birth)}</span>
              <span className="field-label">F. Weight:</span>
              <span className="field-val">{patient.weight} kg</span>
            </div>
          </div>
        </div>

        {/* Section II */}
        <div className="section">
          <div className="section-title">II. Detail of Incidence / Exposure</div>
          <div className="two-col">
            <div className="col">
              <div className="field-row">
                <span className="field-label">A. Date/Time of Bite:</span>
                <span className="field-val">{incident.bite_datetime ? new Date(incident.bite_datetime).toLocaleString('en-PH') : ''}</span>
              </div>
              <div className="field-row">
                <span className="field-label">B. Place of Exposure:</span>
                <span className="field-val">{incident.place_of_exposure}</span>
              </div>
              <div style={{ marginTop:4 }}>
                <span className="field-label">C. Type of Exposure: </span>
                <Radio val="dog" current={incident.animal_type} label="Dog" />
                <Radio val="cat" current={incident.animal_type} label="Cat" />
                <Radio val="bat" current={incident.animal_type} label="Bat" />
                <Radio val="other" current={incident.animal_type} label={`Others: ${incident.animal_other || '___'}`} />
              </div>
              <div style={{ marginTop:6 }}>
                <span className="field-label">E. Circumstance: </span>
                <Radio val="provoked" current={incident.circumstance} label="Provoked" />
                <Radio val="unprovoked" current={incident.circumstance} label="Unprovoked" />
              </div>
            </div>
            <div className="col">
              <div style={{ marginBottom:4 }}><span className="field-label">D. Ownership:</span></div>
              <div><Cb checked={incident.ownership==='owned_vaccinated'} /> Owned/Vaccinated (Date: <span style={{ borderBottom:'1px solid #333', paddingRight:40 }}>{incident.pet_vaccine_date || ''}</span>)</div>
              <div style={{ marginTop:3 }}><Cb checked={incident.ownership==='owned_not_vaccinated'} /> Owned/Not Vaccinated</div>
              <div style={{ marginTop:3 }}><Cb checked={incident.ownership==='stray'} /> Stray</div>
              <div style={{ marginTop:3 }}><Cb checked={incident.ownership==='wild_rabid'} /> Wild/Rabid</div>
            </div>
          </div>
        </div>

        {/* Section III */}
        <div className="section">
          <div className="section-title">III. Wound Description / Wound Care</div>
          <div className="two-col">
            {/* Left */}
            <div className="col">
              <div style={{ marginBottom:6 }}>
                <strong>A. Anatomical Position</strong>
                <div style={{ border:'1px solid #999', padding:8, minHeight:120, marginTop:4 }}>
                  {/* Simple body outline */}
                  <svg width="80" height="120" viewBox="0 0 80 120" style={{ float:'left', marginRight:8 }}>
                    <ellipse cx="40" cy="12" rx="10" ry="12" fill="none" stroke="#333" strokeWidth="1"/>
                    <rect x="28" y="24" width="24" height="30" rx="4" fill="none" stroke="#333" strokeWidth="1"/>
                    <line x1="28" y1="26" x2="12" y2="54" stroke="#333" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="52" y1="26" x2="68" y2="54" stroke="#333" strokeWidth="1.5" strokeLinecap="round"/>
                    <rect x="30" y="54" width="9" height="40" rx="4" fill="none" stroke="#333" strokeWidth="1"/>
                    <rect x="41" y="54" width="9" height="40" rx="4" fill="none" stroke="#333" strokeWidth="1"/>
                    <text x="40" y="108" textAnchor="middle" fontSize="7" fill="#666">Front</text>
                  </svg>
                  <svg width="80" height="120" viewBox="0 0 80 120" style={{ float:'left' }}>
                    <ellipse cx="40" cy="12" rx="10" ry="12" fill="none" stroke="#333" strokeWidth="1"/>
                    <rect x="28" y="24" width="24" height="30" rx="4" fill="none" stroke="#333" strokeWidth="1"/>
                    <line x1="28" y1="26" x2="12" y2="54" stroke="#333" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="52" y1="26" x2="68" y2="54" stroke="#333" strokeWidth="1.5" strokeLinecap="round"/>
                    <rect x="30" y="54" width="9" height="40" rx="4" fill="none" stroke="#333" strokeWidth="1"/>
                    <rect x="41" y="54" width="9" height="40" rx="4" fill="none" stroke="#333" strokeWidth="1"/>
                    <text x="40" y="108" textAnchor="middle" fontSize="7" fill="#666">Back</text>
                  </svg>
                  <div style={{ clear:'both', marginTop:4, fontSize:'8pt' }}>
                    Marked sites: {anatomicalSites.join(', ') || '—'}
                  </div>
                </div>
              </div>
              <div>
                <strong>E. Wound Care</strong>
                <div style={{ marginTop:4 }}>
                  <div>e1. Wound Wash with soap and water: <Cb checked={incident.wound_wash === true || incident.wound_wash === 'true'} /> Y <Cb checked={incident.wound_wash === false || incident.wound_wash === 'false'} /> N</div>
                  <div style={{ marginTop:3 }}>e2. Antiseptic Applied (Povidone/Alcohol): <Cb checked={incident.antiseptic_applied === true || incident.antiseptic_applied === 'true'} /> Y <Cb checked={incident.antiseptic_applied === false || incident.antiseptic_applied === 'false'} /> N</div>
                </div>
              </div>
            </div>
            {/* Right */}
            <div className="col">
              <div style={{ marginBottom:6 }}>
                <strong>B. Wound Status:</strong>
                <div style={{ marginTop:3 }}>
                  <Cb checked={incident.wound_status==='bleeding'} /> Bleeding
                  <span style={{ marginLeft:16 }}><Cb checked={incident.wound_status==='non_bleeding'} /> Non-Bleeding</span>
                </div>
              </div>
              <div style={{ marginBottom:6 }}>
                <strong>C. Wound Category:</strong>
                <div style={{ marginTop:3, lineHeight:1.6 }}>
                  <div><Cb checked={incident.wound_category==='I'} /> <strong>Category I:</strong> Touching or feeding animals, licks on intact skin, contact of intact skin with secretions or excretions of rabid animal or person.</div>
                  <div style={{ marginTop:3 }}><Cb checked={incident.wound_category==='II'} /> <strong>Category II:</strong> Nibbling of uncovered skin, minor scratches or abrasions without bleeding.</div>
                  <div style={{ marginTop:3 }}><Cb checked={incident.wound_category==='III'} /> <strong>Category III:</strong> Single or multiple transdermal bites or scratches, licks on broken skin, contamination of mucous membrane with saliva from licks and exposure to bats.</div>
                </div>
              </div>
              <div>
                <strong>D. Type of Wound:</strong>
                <div style={{ marginTop:3, lineHeight:1.8 }}>
                  {[
                    { val:'superficial', label:'Superficial Scratches' },
                    { val:'abrasion', label:'Abrasion' },
                    { val:'transdermal', label:'Multiple transdermal bites/scratches' },
                    { val:'lick', label:'Lick' },
                    { val:'mucus', label:'Contamination of Mucus Membrane' },
                    { val:'other', label:`Others: ${incident.wound_type_other || '___________'}` },
                  ].map(o => (
                    <span key={o.val} style={{ display:'block' }}>
                      <Cb checked={incident.wound_type === o.val} /> {o.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="quote">
          <em>Better · Greater · Happier</em><br/>
          <strong>Ragay</strong>
        </div>
      </div>

      {/* ===== PAGE 2 ===== */}
      <div className="page">
        {/* Header repeat */}
        <div style={{ textAlign:'center', marginBottom:8, fontSize:'8pt', borderBottom:'1px solid #ccc', paddingBottom:4 }}>
          <strong>RAGAY ABTC</strong> · Patient ID: <strong>{patient.patient_id}</strong> · {patient.full_name} · Consult: {formatDate(incident.consult_date)}
        </div>

        {/* Section IV */}
        <div className="section">
          <div className="section-title">IV. History</div>
          <div className="section-body">
            <div style={{ marginBottom:4 }}><strong>A. Other Medical Conditions/On Treatment:</strong></div>
            <div style={{ lineHeight:1.8 }}>
              <Cb checked={incident.hiv} /> H.I.V.
              <span style={{ marginLeft:12 }}><Cb checked={incident.immunosuppressant} /> Immunosuppressant Agent</span>
              <span style={{ marginLeft:12 }}><Cb checked={incident.long_term_steroid} /> Long-Term Steroid</span>
              <span style={{ marginLeft:12 }}><Cb checked={incident.chloroquine} /> Chloroquine</span>
              <span style={{ marginLeft:12 }}><Cb checked={incident.malignancy} /> Treatment for Malignancy</span>
              <span style={{ marginLeft:12 }}><Cb checked={incident.congenital_immuno} /> Congenital Immuno-deficiency</span>
              <div style={{ marginTop:3 }}>Others (Please specify): <span style={{ borderBottom:'1px solid #333', display:'inline-block', minWidth:200 }}>{incident.other_conditions || ''}</span></div>
            </div>
            <div style={{ marginTop:6 }}>
              <strong>B. Anti-Tetanus Vaccine:</strong> <Cb checked={incident.anti_tetanus_vaccine === true || incident.anti_tetanus_vaccine === 'true'} /> Y <Cb checked={incident.anti_tetanus_vaccine === false || incident.anti_tetanus_vaccine === 'false'} /> N
              {incident.anti_tetanus_vaccine && <span style={{ marginLeft:8 }}>If yes: <span style={{ borderBottom:'1px solid #333', display:'inline-block', minWidth:120 }}></span></span>}
            </div>
            <div style={{ marginTop:4 }}>
              <strong>C. Has completed the anti-rabies shots:</strong> <Cb checked={incident.anti_rabies_completed} /> Y <Cb checked={!incident.anti_rabies_completed} /> N
              {incident.anti_rabies_details && <span style={{ marginLeft:8 }}>If yes (specify): {incident.anti_rabies_details}</span>}
            </div>
            <div style={{ marginTop:4 }}>
              <strong>D. Consulted to local traditional healers / folk remedies:</strong> <Cb checked={incident.folk_remedy} /> Y <Cb checked={!incident.folk_remedy} /> N
              {incident.folk_remedy_details && <span style={{ marginLeft:8 }}>{incident.folk_remedy_details}</span>}
            </div>
            <div style={{ marginTop:4 }}>
              <strong>E.</strong> <Cb checked={incident.smoker} /> Smoker <span style={{ marginLeft:12 }}><Cb checked={incident.alcoholic} /> Alcoholic Drinker</span>
            </div>
          </div>
        </div>

        {/* Section V */}
        <div className="section">
          <div className="section-title">V. Physician's Order / Notes</div>
          <div style={{ padding:4, minHeight:70, fontSize:'9pt' }}>{incident.physician_notes || ''}</div>
        </div>

        {/* Section VI */}
        <div className="section">
          <div className="section-title">VI. Treatment</div>

          {/* PEP/PrEP table */}
          <div style={{ padding:'4px 6px 2px' }}>
            <table>
              <thead>
                <tr>
                  <th rowSpan={2}>Generic Name</th>
                  <th rowSpan={2}>Brand Name</th>
                  <th rowSpan={2}>Batch No.</th>
                  <th colSpan={5}>PEP Dose</th>
                  <th colSpan={4}>PrEP Dose</th>
                  <th rowSpan={2}>Administered By</th>
                </tr>
                <tr>
                  {['D 0','D 3','D 7','D 14','D 28/30'].map(d => <th key={d}>{d}</th>)}
                  {['D 0','D 7','D 14','D 28/30'].map(d => <th key={'prep'+d}>{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {pepDoses.length > 0 ? pepDoses.map((d: any, i: number) => i === 0 ? (
                  <tr key={d.dose_id}>
                    <td>
                      <Cb checked={d.vaccine_type==='PVRV'} /> PVRV
                      <span style={{ marginLeft:8 }}><Cb checked={d.vaccine_type==='PCEC'} /> PCEC 5x</span>
                    </td>
                    <td>{d.brand_name || ''}</td>
                    <td>{d.batch_no || ''}</td>
                    {['D0','D3','D7','D14','D28'].map(day => {
                      const dose = pepDoses.find((dd: any) => dd.dose_day === day);
                      return <td key={day} style={{ textAlign:'center', fontSize:'8pt' }}>{dose?.administered_date ? '✓' : ''}</td>;
                    })}
                    <td></td><td></td><td></td><td></td>
                    <td>{d.administered_by || ''}</td>
                  </tr>
                ) : null) : (
                  <tr>
                    <td><Cb /> PVRV <span style={{ marginLeft:8 }}><Cb /> PCEC 5x</span></td>
                    <td></td><td></td>
                    <td></td><td></td><td></td><td></td><td></td>
                    <td></td><td></td><td></td><td></td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ERIG/HRIG table */}
          <div style={{ padding:'2px 6px' }}>
            <table>
              <thead><tr>
                <th>Anti-Rabies Vaccine</th><th>Brand Name</th><th>Batch No.</th><th>Date</th><th>Administered By</th>
              </tr></thead>
              <tbody><tr>
                <td><Cb checked={incident.erig_hrig==='ERIG'} /> ERIG <span style={{ marginLeft:8 }}><Cb checked={incident.erig_hrig==='HRIG'} /> HRIG</span></td>
                <td>{incident.erig_hrig_brand || ''}</td>
                <td>{incident.erig_hrig_batch || ''}</td>
                <td>{formatDate(incident.erig_hrig_date)}</td>
                <td>{incident.erig_hrig_administered_by || ''}</td>
              </tr></tbody>
            </table>
          </div>

          {/* Tetanus table */}
          <div style={{ padding:'2px 6px 4px' }}>
            <table>
              <thead><tr>
                <th>Tetanus Vaccine</th><th>Brand Name</th><th>Batch No.</th><th>Date</th><th>Administered By</th>
              </tr></thead>
              <tbody><tr>
                <td>
                  <Cb checked={incident.tetanus_type==='TT'} /> TT
                  <span style={{ marginLeft:8 }}><Cb checked={incident.tetanus_type==='TD'} /> TD</span>
                  <span style={{ marginLeft:8 }}><Cb checked={incident.tetanus_type==='ATS'} /> ATS</span>
                  {incident.tetanus_date && <span style={{ marginLeft:8 }}>Date: {formatDate(incident.tetanus_date)}</span>}
                </td>
                <td>{incident.tetanus_brand || ''}</td>
                <td>{incident.tetanus_batch || ''}</td>
                <td>{incident.tetanus_date ? formatDate(incident.tetanus_date) : ''}</td>
                <td>{incident.tetanus_admin_by || ''}</td>
              </tr></tbody>
            </table>
          </div>
        </div>

        {/* Section VII */}
        <div style={{ fontSize:'9pt', marginBottom:12 }}>
          <strong>VII. Refer If Needed:</strong> <span style={{ borderBottom:'1px solid #333', display:'inline-block', minWidth:300 }}></span>
        </div>

        {/* Signatures */}
        <div className="sig-row">
          <div className="sig-block">
            <div style={{ borderTop:'1px solid #333', paddingTop:4 }}>
              {data.data?.nurses?.[0]?.full_name || '________________________________'}<br/>
              <span style={{ fontSize:'8pt' }}>Lic. No. _______________</span><br/>
              <strong>ABTC NURSE</strong>
            </div>
          </div>
          <div className="sig-block">
            <div style={{ borderTop:'1px solid #333', paddingTop:4 }}>
              {data.data?.doctors?.[0]?.full_name || '________________________________'}<br/>
              <span style={{ fontSize:'8pt' }}>Lic. No. _______________</span><br/>
              <strong>ABTC DOCTOR</strong>
            </div>
          </div>
        </div>

        <div className="quote" style={{ marginTop:20 }}>
          <em>Better · Greater · Happier</em><br/>
          <strong>Ragay</strong>
        </div>
      </div>
    </>
  );
}
