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
        if (role === 'nurse') {
          setStep('nurse-select');
        } else {
          router.push('/dashboard');
        }
      } else {
        setError(result.error || 'Invalid username or password');
      }
    } catch (err) {
      setError('Connection error. Please check your internet and try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleNurseSelect(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const sel = form.querySelector('select') as HTMLSelectElement;
    const nurse = nurses.find(n => n.user_id === sel.value);
    if (nurse) {
      setActiveNurse(nurse);
      router.push('/dashboard');
    } else {
      setError('Please select a nurse from the list.');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--teal-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>

      <div style={{ position:'fixed', inset:0, backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(13,148,136,.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(15,118,110,.2) 0%, transparent 50%)', pointerEvents:'none' }} />

      <div style={{ position: 'relative', width: '100%', maxWidth: 420 }}>

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

        <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: '32px 32px 28px', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 18, color: '#b91c1c', fontSize: 14 }}>
              ⚠ {error}
            </div>
          )}

          {step === 'login' && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--slate-800)', marginBottom: 6 }}>Sign in</h2>
              <p style={{ fontSize: 13, color: 'var(--slate-500)', marginBottom: 24 }}>Access the ABTC patient management system</p>

              <form onSubmit={handleLogin}>
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">Username</label>
                  <input
                    className="form-input"
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    autoFocus
                    autoComplete="username"
                    placeholder="Enter username"
                    disabled={loading}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 24 }}>
                  <label className="form-label">Password</label>
                  <input
                    className="form-input"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Enter password"
                    disabled={loading}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={loading || !username || !password}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15 }}
                >
                  {loading
                    ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Signing in…</>
                    : 'Sign In'}
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
                  {nurses.length === 0 ? (
                    <div style={{ padding: '10px 12px', background: 'var(--slate-50)', border: '1.5px solid var(--slate-200)', borderRadius: 'var(--radius-sm)', fontSize: 14, color: 'var(--slate-500)' }}>
                      No nurses found — ask your admin to add nurse accounts.
                    </div>
                  ) : (
                    <select className="form-select" required defaultValue="">
                      <option value="" disabled>-- Select your name --</option>
                      {nurses.map(n => (
                        <option key={n.user_id} value={n.user_id}>
                          {n.full_name}{n.credential ? `, ${n.credential}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => { setStep('login'); setError(''); }}
                  >
                    ← Back
                  </button>
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={nurses.length === 0}
                    style={{ flex: 2, justifyContent: 'center', padding: '12px', fontSize: 15 }}
                  >
                    Continue →
                  </button>
                </div>
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
