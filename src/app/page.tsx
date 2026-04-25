'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { login, nurses, setActiveNurse } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'login' | 'nurse-select'>('login');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await login(username, password);
      if (result.ok) {
        const saved = localStorage.getItem('abtc_session');
        const role = saved ? JSON.parse(saved)?.user?.role : null;
        if (role === 'nurse') setStep('nurse-select');
        else router.push('/dashboard');
      } else {
        setError(result.error || 'Invalid username or password');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleNurseSelect(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const sel = form.querySelector('select') as HTMLSelectElement;
    const nurse = nurses.find(n => n.user_id === sel.value);
    if (nurse) { setActiveNurse(nurse); router.push('/dashboard'); }
    else setError('Please select your name from the list.');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#EFF6FF' }}>

      {/* ── Left panel — branding ── */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(160deg, #172554 0%, #1e40af 60%, #1d4ed8 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Three logos in a row — equal size */}
        <div style={{ display:'flex', gap:20, alignItems:'center', justifyContent:'center', marginBottom:28 }}>
          {[
            { src:'/logos/bagong_pilipinas.jpg', alt:'Bagong Pilipinas' },
            { src:'/logos/lgu_logo.jpg',         alt:'Municipality of Ragay' },
            { src:'/logos/rhu_logo.png',          alt:'Rural Health Unit' },
          ].map(logo => (
            <div key={logo.alt} style={{
              width: 80, height: 80,
              background: 'white', borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 5,
              border: '1px solid rgba(15,23,42,.08)',
              flexShrink: 0,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo.src} alt={logo.alt} style={{ width:'100%', height:'100%', objectFit:'contain', borderRadius:8 }} />
            </div>
          ))}
        </div>

        {/* Title block */}
        <div style={{ textAlign:'center', color:'white' }}>
          <h1 style={{ fontSize:30, fontWeight:800, lineHeight:1.25, marginBottom:10, letterSpacing:'-.01em' }}>
            Ragay Animal Bite<br/>Treatment Center
          </h1>
          <div style={{ width:56, height:3, background:'#60a5fa', borderRadius:2, margin:'0 auto 14px' }} />
          <p style={{ fontSize:14, color:'#bfdbfe', lineHeight:1.7 }}>
            Poblacion, Ragay, Camarines Sur<br/>
            Municipality Health Office
          </p>
        </div>

        {/* Tagline — bottom, styled as logo */}
        <div style={{
          position: 'absolute', bottom: 32, left: 0, right: 0,
          textAlign: 'center',
        }}>
          <div style={{
            display: 'inline-block',
            padding: '10px 28px',
            border: '2px solid #3b82f6',
            borderRadius: 40,
            background: 'rgba(59,130,246,.1)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#60a5fa', letterSpacing: '.18em', textTransform: 'uppercase' }}>
              BETTER · GREATER · HAPPIER
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#93c5fd', letterSpacing: '.12em', lineHeight: 1.1, marginTop: 2 }}>
              RAGAY
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div style={{
        width: 420,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 36px',
        background: 'white',
        borderLeft: '1px solid var(--slate-200)',
      }}>
        <div style={{ width:'100%', maxWidth: 340 }}>

          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1e3a8a', marginBottom: 6 }}>
              {step === 'login' ? 'Sign in' : "Who's on duty?"}
            </h2>
            <p style={{ fontSize: 13, color: '#64748b' }}>
              {step === 'login'
                ? 'Access the ABTC patient management system'
                : 'Select your name to continue'}
            </p>
          </div>

          {error && (
            <div className="alert alert-red" style={{ marginBottom: 16 }}>
              <span>⚠</span> {error}
            </div>
          )}

          {step === 'login' && (
            <form onSubmit={handleLogin}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Username</label>
                <input className="form-input" type="text" value={username}
                  onChange={e => setUsername(e.target.value)}
                  required autoFocus autoComplete="username"
                  placeholder="Enter username" disabled={loading}
                  style={{ fontSize: 14, padding: '10px 12px' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 22 }}>
                <label className="form-label">Password</label>
                <input className="form-input" type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password"
                  placeholder="••••••••" disabled={loading}
                  style={{ fontSize: 14, padding: '10px 12px' }}
                />
              </div>
              <button className="btn btn-primary" type="submit"
                disabled={loading || !username || !password}
                style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14 }}>
                {loading ? <><span className="spinner" /> Signing in…</> : 'Sign In →'}
              </button>
            </form>
          )}

          {step === 'nurse-select' && (
            <form onSubmit={handleNurseSelect}>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Select Your Name</label>
                {nurses.length === 0 ? (
                  <div style={{ padding:'10px 12px', background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:6, fontSize:13, color:'#64748b' }}>
                    No nurse accounts found. Ask your administrator.
                  </div>
                ) : (
                  <select className="form-select" required defaultValue="" style={{ fontSize: 14, padding: '10px 12px' }}>
                    <option value="" disabled>-- Select your name --</option>
                    {nurses.map(n => (
                      <option key={n.user_id} value={n.user_id}>
                        {n.full_name}{n.credential ? `, ${n.credential}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button type="button" className="btn btn-secondary"
                  onClick={() => { setStep('login'); setError(''); }}
                  style={{ flex:1, justifyContent:'center' }}>
                  ← Back
                </button>
                <button className="btn btn-primary" type="submit"
                  disabled={nurses.length === 0}
                  style={{ flex:2, justifyContent:'center', padding:'11px' }}>
                  Continue →
                </button>
              </div>
            </form>
          )}

          {/* Copyright */}
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #f1f5f9', textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>
            © {new Date().getFullYear()} Ragay Animal Bite Treatment Center<br/>
            Municipality Health Office · Ragay, Camarines Sur
          </div>
        </div>
      </div>
    </div>
  );
}
