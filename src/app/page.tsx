'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Image from 'next/image';

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

      {/* Left panel — branding */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(160deg, var(--blue-900) 0%, var(--blue-700) 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position:'absolute', top:-80, right:-80, width:300, height:300, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-60, left:-60, width:240, height:240, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }} />

        {/* Logos row */}
        <div style={{ display:'flex', gap:16, alignItems:'center', marginBottom:32 }}>
          {[
            { src:'/logos/bagong_pilipinas.jpg', alt:'Bagong Pilipinas' },
            { src:'/logos/lgu_logo.jpg', alt:'Municipality of Ragay' },
            { src:'/logos/rhu_logo.png', alt:'Rural Health Unit' },
          ].map(logo => (
            <div key={logo.alt} style={{ width:64, height:64, background:'white', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', padding:4, boxShadow:'0 4px 12px rgba(0,0,0,.2)' }}>
              <img src={logo.src} alt={logo.alt} style={{ width:'100%', height:'100%', objectFit:'contain', borderRadius:8 }} />
            </div>
          ))}
        </div>

        <div style={{ textAlign:'center', color:'white' }}>
          <div style={{ fontSize:13, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--blue-200)', marginBottom:10, fontWeight:700 }}>
            Republic of the Philippines
          </div>
          <h1 style={{ fontSize:28, fontWeight:800, lineHeight:1.2, marginBottom:8 }}>
            Ragay Animal Bite<br/>Treatment Center
          </h1>
          <div style={{ width:48, height:3, background:'var(--blue-300)', borderRadius:2, margin:'14px auto' }} />
          <p style={{ fontSize:13, color:'var(--blue-200)', lineHeight:1.6 }}>
            Municipal Health Office<br/>
            Población, Ragay, Camarines Sur
          </p>
        </div>

        <div style={{ position:'absolute', bottom:24, left:0, right:0, textAlign:'center', fontSize:11, color:'rgba(255,255,255,.35)', letterSpacing:'.08em' }}>
          BETTER · GREATER · HAPPIER · RAGAY
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ width:420, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 36px', background:'white', boxShadow:'-4px 0 24px rgba(0,0,0,.08)' }}>

        <div style={{ width:'100%', maxWidth:340 }}>
          <div style={{ marginBottom:28 }}>
            <div style={{ width:44, height:44, background:'var(--blue-600)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, marginBottom:16, boxShadow:'var(--shadow-blue)' }}>
              🏥
            </div>
            <h2 style={{ fontSize:22, fontWeight:800, color:'var(--blue-900)', marginBottom:4 }}>
              {step === 'login' ? 'Sign in' : 'Who\'s on duty?'}
            </h2>
            <p style={{ fontSize:13, color:'var(--slate-500)' }}>
              {step === 'login' ? 'Access the ABTC patient management system' : 'Select your name to continue'}
            </p>
          </div>

          {error && (
            <div className="alert alert-red" style={{ marginBottom:16 }}>
              <span>⚠</span> {error}
            </div>
          )}

          {step === 'login' && (
            <form onSubmit={handleLogin}>
              <div className="form-group" style={{ marginBottom:14 }}>
                <label className="form-label">Username</label>
                <input className="form-input" type="text" value={username}
                  onChange={e => setUsername(e.target.value)}
                  required autoFocus autoComplete="username"
                  placeholder="Enter username" disabled={loading}
                  style={{ fontSize:14, padding:'10px 12px' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom:22 }}>
                <label className="form-label">Password</label>
                <input className="form-input" type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password"
                  placeholder="••••••••" disabled={loading}
                  style={{ fontSize:14, padding:'10px 12px' }}
                />
              </div>
              <button className="btn btn-primary" type="submit"
                disabled={loading || !username || !password}
                style={{ width:'100%', justifyContent:'center', padding:'11px', fontSize:14 }}>
                {loading ? <><span className="spinner" />  Signing in…</> : 'Sign In →'}
              </button>
            </form>
          )}

          {step === 'nurse-select' && (
            <form onSubmit={handleNurseSelect}>
              <div className="form-group" style={{ marginBottom:20 }}>
                <label className="form-label">Select Your Name</label>
                {nurses.length === 0 ? (
                  <div style={{ padding:'10px 12px', background:'var(--slate-50)', border:'1.5px solid var(--slate-200)', borderRadius:'var(--radius-sm)', fontSize:13, color:'var(--slate-500)' }}>
                    No nurse accounts found. Ask your administrator.
                  </div>
                ) : (
                  <select className="form-select" required defaultValue="" style={{ fontSize:14, padding:'10px 12px' }}>
                    <option value="" disabled>-- Select your name --</option>
                    {nurses.map(n => (
                      <option key={n.user_id} value={n.user_id}>
                        {n.full_name}{n.credential ? ` (${n.credential})` : ''}
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

          <div style={{ marginTop:24, paddingTop:20, borderTop:'1px solid var(--slate-100)', textAlign:'center', fontSize:11, color:'var(--slate-400)' }}>
            Ragay ABTC · Municipal Health Office · CamSur
          </div>
        </div>
      </div>
    </div>
  );
}
