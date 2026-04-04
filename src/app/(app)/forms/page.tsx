'use client';

const FORMS = [
  {
    id: 'abtc-patient-record',
    title: 'ABTC Patient Record Form',
    description: 'Standard 2-page patient intake and treatment record for the Ragay Animal Bite Treatment Center.',
    pages: 2,
    href: '/forms/blank-abtc-form',
  },
];

export default function FormsPage() {
  return (
    <div className="page-wrapper">
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">📋 Forms</h1>
          <p style={{ color:'var(--slate-500)', fontSize:13, marginTop:2 }}>Download and print blank forms for manual use.</p>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16, marginTop:8 }}>
        {FORMS.map(form => (
          <div key={form.id} className="card" style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
              <div style={{ fontSize:32, lineHeight:1 }}>📄</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:15, color:'var(--slate-800)', marginBottom:4 }}>{form.title}</div>
                <div style={{ fontSize:12, color:'var(--slate-500)', marginBottom:6 }}>{form.description}</div>
                <div style={{ fontSize:11, color:'var(--slate-400)' }}>{form.pages} page{form.pages > 1 ? 's' : ''} · A4</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, marginTop:'auto' }}>
              <button
                className="btn btn-primary btn-sm"
                style={{ flex:1 }}
                onClick={() => window.open(form.href, '_blank')}
              >
                🖨 View &amp; Print
              </button>
              {/* Download: open in new tab — user can Save As PDF from the print dialog */}
              <button
                className="btn btn-secondary btn-sm"
                style={{ flex:1 }}
                onClick={() => {
                  const win = window.open(form.href + '?download=1', '_blank');
                  if (win) {
                    win.addEventListener('load', () => {
                      setTimeout(() => win.print(), 800);
                    });
                  }
                }}
              >
                ⬇ Download PDF
              </button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop:20, padding:'12px 16px', background:'#f0f9ff', borderRadius:8, border:'1px solid #bae6fd', fontSize:12, color:'#0369a1' }}>
        💡 <strong>Tip:</strong> To save as PDF, click <strong>Download PDF</strong> — the print dialog will open. Select <em>"Save as PDF"</em> as the destination.
      </div>
    </div>
  );
}
