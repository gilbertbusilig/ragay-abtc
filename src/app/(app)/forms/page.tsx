'use client';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
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
              <button
                className="btn btn-secondary btn-sm"
                style={{ flex:1 }}
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = form.href;
                  a.target = '_blank';
                  a.click();
                }}
              >
                ⬇ Download
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
