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
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const result = await login(username, password);
    setLoading(false);
    if (result.ok) {
      if (result.ok) {
        // If role is nurse → show nurse selector
        const saved = JSON.parse(localStorage.getItem('abtc_session') || '{}');
        if (saved.user?.role === 'nurse') {
          setLoggedInUser(saved.user);
          setStep('nurse-select');
        } else {
          router.push('/dashboard');
        }
      }
    } else {
      setError(result.error || 'Invalid credentials');
    }
  }

  function handleNurseSelect(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const sel = form.querySelector('select') as HTMLSelectElement;
    const nurse = nurses.find(n => n.user_id === sel.value);
    if (nurse) { setActiveNurse(nurse); router.push('/dashboard'); }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--teal-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>

      {/* Background pattern */}
      <div style={{ position:'fixed', inset:0, backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(13,148,136,.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(15,118,110,.2) 0%, transparent 50%)', pointerEvents:'none' }} />

      <div style={{ position: 'relative', width: '100%', maxWidth: 420 }}>
        {/* Logo / Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: 'var(--teal-500)', borderRadius: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, marginBottom: 16, boxShadow: '0 4px 20px rgba(20,184,166,.4)' }}>
            ✚
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', color: 'white', fontSize: 22, fontStyle: 'italic', lineHeight: 1.3 }}>
            Ragay Animal Bite<br />Treatment Center
          </h1>
          <p style={{ color: 'var(--teal-400)', fontSize: 12, marginTop: 6, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Municipal Health Office • Población, Ragay, CamSur
          </p>
        </div>

        {/* Login Card */}
        <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: '32px 32px 28px', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>

          {step === 'login' && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--slate-800)', marginBottom: 6 }}>Sign in</h2>
              <p style={{ fontSize: 13, color: 'var(--slate-500)', marginBottom: 24 }}>Access the ABTC patient management system</p>

              {error && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 18, color: '#b91c1c', fontSize: 14 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">Username</label>
                  <input className="form-input" type="text" value={username} onChange={e => setUsername(e.target.value)} required autoFocus placeholder="Enter username" />
                </div>
                <div className="form-group" style={{ marginBottom: 24 }}>
                  <label className="form-label">Password</label>
                  <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter password" />
                </div>
                <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15 }}>
                  {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Signing in…</> : 'Sign In'}
                </button>
              </form>
            </>
          )}

          {step === 'nurse-select' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>👩‍⚕️</div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--slate-800)', marginBottom: 4 }}>Select Your Name</h2>
                <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>Choose which nurse is currently on duty</p>
              </div>
              <form onSubmit={handleNurseSelect}>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">Nurse on Duty</label>
                  <select className="form-select" required>
                    <option value="">-- Select nurse --</option>
                    {nurses.map(n => (
                      <option key={n.user_id} value={n.user_id}>
                        {n.full_name}{n.credential ? `, ${n.credential}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15 }}>
                  Continue
                </button>
              </form>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', color: 'var(--teal-400)', fontSize: 12, marginTop: 20 }}>
          Better · Greater · Happier — Ragay
        </p>
      </div>
    </div>
  );
}
