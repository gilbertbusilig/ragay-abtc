'use client';
import { useRouter } from 'next/navigation';

export default function BlankABTCForm() {
  const router = useRouter();
  const Cb = () => (
    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:12, height:12, border:'1px solid #333', marginRight:3, fontSize:9, verticalAlign:'middle', flexShrink:0 }} />
  );
  const Line = ({ w = 120 }: { w?: number }) => (
    <span style={{ borderBottom:'1px solid #333', display:'inline-block', minWidth:w, marginLeft:3 }}>&nbsp;</span>
  );

  return (
    <>
      <style>{`
        @page { size: A4; margin: 10mm 10mm 10mm 10mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 8pt; color: #000; background: white; margin: 0; }
        .page { width: 100%; min-height: 277mm; page-break-after: always; display: flex; flex-direction: column; }
        .page:last-child { page-break-after: auto; }
        .page-content { flex: 1; }
        .section { border: 1px solid #333; margin-bottom: 4px; }
        .section-title { background: #dce8f5; border-bottom: 1px solid #333; padding: 2px 6px; font-weight: bold; font-size: 8pt; }
        .section-body { padding: 3px 6px; }
        .row { display: flex; gap: 6px; align-items: baseline; margin-bottom: 3px; flex-wrap: wrap; }
        .lbl { font-weight: bold; white-space: nowrap; }
        .val { flex: 1; border-bottom: 1px solid #555; min-width: 60px; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; }
        .col { padding: 3px 6px; }
        .col+.col { border-left: 1px solid #333; }
        table { width: 100%; border-collapse: collapse; font-size: 7pt; }
        th, td { border: 1px solid #333; padding: 3px 3px; vertical-align: middle; }
        th { background: #dce8f5; font-weight: bold; text-align: center; }
        .sig-row { display: flex; justify-content: space-between; margin-top: 12px; gap: 20px; }
        .sig-block { text-align: center; flex: 1; }
        .sig-line { border-top: 1.5px solid #333; padding-top: 3px; }
        .footer { text-align:center; margin-top:auto; padding-top:5px; border-top:1.5px solid #1d4ed8; }
        @media screen {
          body { background: #ccc; }
          .page { background: white; max-width: 210mm; margin: 16px auto; padding: 10mm; box-shadow: 0 2px 16px rgba(0,0,0,.2); min-height: auto; }
        }
        @media print { .screen-controls { display: none !important; } }
      `}</style>

      <div className="screen-controls" style={{ position:'fixed', top:16, right:16, display:'flex', gap:10, zIndex:1000 }}>
        <button onClick={() => router.back()} style={{ padding:'8px 16px', background:'#64748b', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:700 }}>← Back</button>
        <button onClick={() => window.print()} style={{ padding:'8px 20px', background:'#1d4ed8', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:700, boxShadow:'0 4px 12px rgba(29,78,216,.4)' }}>🖨 Print / Download</button>
      </div>

      {/* ===== PAGE 1 ===== */}
      <div className="page">
        <div className="page-content">
          {/* Header */}
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
            <span><span className="lbl">Date of Consultation:</span><Line w={160} /></span>
            <span><span className="lbl">Patient ID No.:</span><Line w={100} /></span>
          </div>

          {/* Section I */}
          <div className="section">
            <div className="section-title">I. Patient Information</div>
            <div className="section-body">
              <div className="row">
                <span className="lbl">A. Full Name:</span><span className="val" />
                <span className="lbl">D. Sex:</span>
                <span><Cb /> M &nbsp; <Cb /> F</span>
                <span className="lbl">G. Contact No.:</span><span className="val" />
              </div>
              <div className="row">
                <span className="lbl">B. Address:</span><span className="val" style={{ flex:3 }} />
                <span className="lbl">E. Age:</span><span className="val" style={{ minWidth:40 }} />
              </div>
              <div className="row">
                <span className="lbl">C. Date of Birth:</span><span className="val" style={{ minWidth:120 }} />
                <span className="lbl">F. Weight:</span><span className="val" style={{ minWidth:60 }} />
              </div>
            </div>
          </div>

          {/* Section II */}
          <div className="section">
            <div className="section-title">II. Detail of Incidence / Exposure</div>
            <div className="two-col">
              <div className="col">
                <div className="row"><span className="lbl">A. Date/Time of Bite:</span><span className="val" /></div>
                <div className="row"><span className="lbl">B. Place of Exposure:</span><span className="val" /></div>
                <div style={{ marginTop:3, fontSize:'7.5pt' }}>
                  <span className="lbl">C. Type of Exposure: </span>
                  <span style={{ marginRight:12 }}><Cb /> Dog</span>
                  <span style={{ marginRight:12 }}><Cb /> Cat</span>
                  <span style={{ marginRight:12 }}><Cb /> Bat</span>
                  <span><Cb /> Others: <Line w={60} /></span>
                </div>
                <div style={{ marginTop:4, fontSize:'7.5pt' }}>
                  <span className="lbl">E. Circumstance: </span>
                  <span style={{ marginRight:12 }}><Cb /> Provoked</span>
                  <span><Cb /> Unprovoked</span>
                </div>
              </div>
              <div className="col" style={{ fontSize:'7.5pt' }}>
                <div style={{ marginBottom:3 }}><span className="lbl">D. Ownership:</span></div>
                <div><Cb /> Owned/Vaccinated &nbsp; (Date: <Line w={70} />)</div>
                <div style={{ marginTop:3 }}><Cb /> Owned / Not Vaccinated</div>
                <div style={{ marginTop:3 }}><Cb /> Stray</div>
                <div style={{ marginTop:3 }}><Cb /> Wild / Rabid</div>
              </div>
            </div>
          </div>

          {/* Section III */}
          <div className="section">
            <div className="section-title">III. Wound Description / Wound Care</div>
            <div className="two-col">
              <div className="col" style={{ display:'flex', flexDirection:'column' }}>
                <strong style={{ fontSize:'7.5pt' }}>A. Anatomical Position</strong>
                <div style={{ border:'1px solid #aaa', marginTop:3, background:'#fff', padding:'4px 2px', flex:1, display:'flex', flexDirection:'column', justifyContent:'center' }}>
                  <img src="/logos/anatomical_new.jpg" alt="Anatomical Position"
                    style={{ width:'100%', height:'auto', maxHeight:215, objectFit:'contain', display:'block' }} />
                  <div style={{ fontSize:'7pt', marginTop:4, paddingLeft:2 }}>
                    <strong>Marked:</strong> <Line w={120} />
                  </div>
                </div>
                <div style={{ marginTop:4 }}>
                  <strong style={{ fontSize:'7.5pt' }}>E. Wound Care</strong>
                  <div style={{ marginTop:2, lineHeight:1.7, fontSize:'7.5pt' }}>
                    <div>e1. Wound Wash with soap and water: &nbsp; <Cb /> Y &nbsp; <Cb /> N</div>
                    <div>e2. Antiseptic Applied (Povidone/Alcohol): &nbsp; <Cb /> Y &nbsp; <Cb /> N</div>
                  </div>
                </div>
              </div>
              <div className="col">
                <div style={{ marginBottom:4, fontSize:'7.5pt' }}>
                  <strong>B. Wound Status: &nbsp;</strong><Cb /> Bleeding &nbsp;&nbsp; <Cb /> Non-Bleeding
                </div>
                <div style={{ marginBottom:4, lineHeight:1.55, fontSize:'7.5pt' }}>
                  <strong>C. Wound Category:</strong>
                  <div style={{ marginTop:2 }}>
                    <div><Cb /> <strong>Category I:</strong> Touching/feeding animals, licks on intact skin, contact of intact skin with secretions.</div>
                    <div style={{ marginTop:3 }}><Cb /> <strong>Category II:</strong> Nibbling of uncovered skin, minor scratches or abrasions without bleeding.</div>
                    <div style={{ marginTop:3 }}><Cb /> <strong>Category III:</strong> Transdermal bites/scratches, licks on broken skin, contamination of mucous membrane, exposure to bats.</div>
                  </div>
                </div>
                <div style={{ lineHeight:1.7, fontSize:'7.5pt' }}>
                  <strong>D. Type of Wound:</strong>
                  {['Superficial Scratches','Abrasion','Multiple transdermal bites/scratches','Lick','Contamination of Mucus Membrane'].map(l => (
                    <div key={l}><Cb /> {l}</div>
                  ))}
                  <div><Cb /> Others: <Line w={80} /></div>
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
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5, paddingBottom:4, borderBottom:'2px solid #1d4ed8' }}>
            <div style={{ textAlign:'center', flex:1 }}>
              <div style={{ fontSize:'11pt', fontWeight:900, color:'#1e3a8a' }}>RAGAY ANIMAL BITE TREATMENT CENTER</div>
              <div style={{ fontSize:'7.5pt' }}>Poblacion, Ragay, Camarines Sur · Municipal Health Office</div>
            </div>
          </div>

          {/* Section IV */}
          <div className="section">
            <div className="section-title">IV. History</div>
            <div className="section-body">
              <div style={{ marginBottom:2 }}><strong>A. Other Medical Conditions/On Treatment:</strong></div>
              <div style={{ lineHeight:1.85, fontSize:'7.5pt' }}>
                <div><Cb /> H.I.V. / Congenital Immunodeficiency</div>
                <div><Cb /> Immunosuppressant Agent / Long-Term Steroid</div>
                <div><Cb /> Chloroquine Treatment</div>
                <div><Cb /> Malignancy (On Treatment)</div>
                <div style={{ marginTop:2 }}>Others: <Line w={220} /></div>
              </div>
              <div style={{ marginTop:3, lineHeight:1.8, fontSize:'7.5pt' }}>
                <div><strong>B. Anti-Tetanus Vaccine:</strong> &nbsp; <Cb /> Y &nbsp; <Cb /> N &nbsp; If yes: <Line w={100} /></div>
                <div><strong>C. Completed anti-rabies shots:</strong> &nbsp; <Cb /> Y &nbsp; <Cb /> N &nbsp; <Line w={100} /></div>
                <div><strong>D. Consulted traditional/folk healers:</strong> &nbsp; <Cb /> Y &nbsp; <Cb /> N &nbsp; <Line w={100} /></div>
                <div><strong>E.</strong> &nbsp; <Cb /> Smoker &nbsp;&nbsp; <Cb /> Alcoholic Drinker</div>
                <div><strong>F. Allergy:</strong> &nbsp; <Line w={220} /></div>
              </div>
            </div>
          </div>

          {/* Section V — bigger */}
          <div className="section">
            <div className="section-title">V. Physician's Order / Notes</div>
            <div style={{ padding:'4px 6px', minHeight:80 }}>&nbsp;</div>
          </div>

          {/* Section VI */}
          <div className="section">
            <div className="section-title">VI. Treatment</div>

            <div style={{ padding:'3px 5px 2px' }}>
              <div style={{ fontSize:'7pt', fontWeight:'bold', marginBottom:3 }}>PEP Schedule Date</div>
              <table>
                <thead><tr>
                  <th style={{ width:'10%', textAlign:'left', paddingLeft:4 }}>Dose</th>
                  <th style={{ width:'6%' }}>PVRV</th>
                  <th style={{ width:'6%' }}>PCEC</th>
                  <th style={{ width:'14%' }}>Brand Name</th>
                  <th style={{ width:'12%' }}>Batch No.</th>
                  <th style={{ width:'18%' }}>Schedule Date</th>
                  <th style={{ width:'16%' }}>Date Given</th>
                  <th>Administered By</th>
                </tr></thead>
                <tbody>
                  {['D 0','D 3','D 7','D 14','D 28/30'].map((d, i) => (
                    <tr key={d} style={{ background: i%2===0 ? 'white' : '#f0f4ff' }}>
                      <td style={{ fontWeight:'bold', fontSize:'7.5pt', paddingLeft:4 }}>{d}</td>
                      <td style={{ textAlign:'center' }}><Cb /></td>
                      <td style={{ textAlign:'center' }}><Cb /></td>
                      <td /><td /><td /><td /><td />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ padding:'2px 5px 3px' }}>
              <div style={{ fontSize:'7pt', fontWeight:'bold', marginBottom:3 }}>PrEP Schedule Date</div>
              <table>
                <thead><tr>
                  <th style={{ width:'10%', textAlign:'left', paddingLeft:4 }}>Dose</th>
                  <th style={{ width:'6%' }}>PVRV</th>
                  <th style={{ width:'6%' }}>PCEC</th>
                  <th style={{ width:'14%' }}>Brand Name</th>
                  <th style={{ width:'12%' }}>Batch No.</th>
                  <th style={{ width:'18%' }}>Schedule Date</th>
                  <th style={{ width:'16%' }}>Date Given</th>
                  <th>Administered By</th>
                </tr></thead>
                <tbody>
                  {['D 0','D 7','D 14','D 28/30'].map((d, i) => (
                    <tr key={d} style={{ background: i%2===0 ? 'white' : '#f0f4ff' }}>
                      <td style={{ fontWeight:'bold', fontSize:'7.5pt', paddingLeft:4 }}>{d}</td>
                      <td style={{ textAlign:'center' }}><Cb /></td>
                      <td style={{ textAlign:'center' }}><Cb /></td>
                      <td /><td /><td /><td /><td />
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
                <tbody><tr style={{ height:22 }}>
                  <td><Cb /> ERIG &nbsp; <Cb /> HRIG</td>
                  <td /><td /><td /><td />
                </tr></tbody>
              </table>
            </div>

            <div style={{ padding:'2px 5px 3px' }}>
              <table>
                <thead><tr>
                  <th style={{ width:'18%' }}>Tetanus Vaccine</th>
                  <th>Brand Name</th><th>Batch No.</th><th>Date</th><th>Administered By</th>
                </tr></thead>
                <tbody><tr style={{ height:22 }}>
                  <td><Cb /> TT &nbsp; <Cb /> TD &nbsp; <Cb /> ATS</td>
                  <td /><td /><td /><td />
                </tr></tbody>
              </table>
            </div>
          </div>

          <div style={{ fontSize:'8pt', marginBottom:8 }}><strong>VII. Refer If Needed:</strong></div>

          <div className="sig-row">
            <div className="sig-block">
              <div style={{ minHeight:30 }} />
              <div>
                <Line w={180} /><br/>
                <span style={{ fontSize:'7pt' }}>Lic. No.: <Line w={100} /></span>
                <div className="sig-line" />
                <strong style={{ fontSize:'7.5pt' }}>ABTC NURSE</strong>
              </div>
            </div>
            <div className="sig-block">
              <div style={{ minHeight:30 }} />
              <div>
                <Line w={180} /><br/>
                <span style={{ fontSize:'7pt' }}>Lic. No.: <Line w={100} /></span>
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
