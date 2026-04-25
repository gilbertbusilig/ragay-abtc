'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { User } from '@/types';
import { useAuth } from '@/lib/auth';

interface UserRow extends User { is_active: boolean; created_at: string; }

export default function AccountsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [accounts, setAccounts] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    username: '', password: '', role: 'nurse',
    full_name: '', credential: '', license_no: '',
  });

  useEffect(() => {
    if (user?.role !== 'admin') { router.replace('/dashboard'); return; }
    load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await api.getAccounts();
    if (res.status === 'ok') setAccounts(res.data);
    setLoading(false);
  }

  function openCreate() { setEditUser(null); setForm({ username:'', password:'', role:'nurse', full_name:'', credential:'', license_no:'' }); setShowModal(true); }
  function openEdit(u: UserRow) { setEditUser(u); setForm({ username: u.username, password:'', role: u.role, full_name: u.full_name, credential: u.credential, license_no: u.license_no }); setShowModal(true); }

  async function handleSave() {
    setSaving(true);
    let res;
    if (editUser) {
      const updateData: any = { user_id: editUser.user_id, full_name: form.full_name, credential: form.credential, license_no: form.license_no };
      if (form.password) updateData.password = form.password;
      res = await api.updateAccount(updateData);
    } else {
      if (!form.username || !form.password) { setSaving(false); return; }
      res = await api.createAccount({ ...form, created_by: user?.user_id });
    }
    setSaving(false);
    if (res.status === 'ok') {
      setShowModal(false);
      showToast(editUser ? 'Account updated ✓' : 'Account created ✓', 'success');
      load();
    } else {
      showToast('Error: ' + res.message);
    }
  }

  async function toggleActive(u: UserRow) {
    await api.updateAccount({ user_id: u.user_id, is_active: !u.is_active });
    showToast(u.is_active ? 'Account deactivated' : 'Account activated', 'success');
    load();
  }

  function showToast(msg: string, type = '') { setToast(msg); setTimeout(() => setToast(''), 3000); }

  const roleColor: Record<string, string> = { admin: 'var(--red-600)', doctor:'var(--blue-700)', nurse:'#7c3aed' };
  const roleLabel = (role: string) => role === 'admin' ? 'Administrator' : role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Accounts</h1>
          <p className="page-subtitle">Manage system users — doctors, nurses, and administrators</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Account</button>
      </div>

      <div className="page-body">
        {/* Nurse note */}
        <div style={{ background:'var(--blue-50)', border:'1px solid var(--blue-200)', borderRadius:'var(--radius-md)', padding:'10px 16px', marginBottom:16, fontSize:13, color:'var(--blue-800)' }}>
          <strong>ℹ️ Nurse Accounts:</strong> All nurses share one login account. Add up to 10 nurse names here. When nurses log in, they select their name from a dropdown on the login screen and sidebar.
        </div>

        <div className="card">
          {loading ? (
            <div className="page-loader" style={{ minHeight:300 }}>
              <div className="spinner" style={{ width:28, height:28 }} />
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>Name</th><th>Username</th><th>Role</th><th>Credential</th><th>License No.</th><th>Status</th><th>Created</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {accounts.map(a => (
                    <tr key={a.user_id}>
                      <td style={{ fontWeight:500 }}>{a.full_name || '—'}</td>
                      <td><span style={{ fontFamily:'monospace', fontSize:13 }}>{a.username}</span></td>
                      <td>
                        <span style={{ display:'inline-block', padding:'2px 10px', borderRadius:12, fontSize:11, fontWeight:700, textTransform:'uppercase', background: a.role === 'admin' ? '#fee2e2' : a.role === 'doctor' ? 'var(--blue-50)' : '#f3e8ff', color: roleColor[a.role] || 'var(--slate-600)', letterSpacing:'.04em' }}>
                          {roleLabel(a.role)}
                        </span>
                      </td>
                      <td style={{ fontSize:13 }}>{a.credential || '—'}</td>
                      <td style={{ fontSize:13, fontFamily:'monospace' }}>{a.license_no || '—'}</td>
                      <td>
                        <span className={`badge ${a.is_active ? 'badge-active' : 'badge-overdue'}`}>{a.is_active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td style={{ fontSize:12, color:'var(--slate-500)' }}>
                        {a.created_at ? new Date(a.created_at).toLocaleDateString('en-PH') : '—'}
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(a)}>Edit</button>
                          <button className={`btn btn-sm ${a.is_active ? 'btn-danger' : 'btn-ghost'}`} onClick={() => toggleActive(a)}>
                            {a.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Nurse count info */}
        <div style={{ marginTop:12, fontSize:13, color:'var(--slate-500)' }}>
          Nurses: {accounts.filter(a => a.role === 'nurse' && a.is_active).length} / 10 active
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editUser ? 'Edit Account' : 'Create Account'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid form-grid-2">
                <div className="form-group" style={{ gridColumn:'1 / -1' }}>
                  <label className="form-label">Full Name</label>
                  <input className="form-input" type="text" value={form.full_name} onChange={e => setForm(p=>({...p, full_name:e.target.value}))} placeholder="Last, First Middle I." />
                </div>
                {!editUser && <>
                  <div className="form-group">
                    <label className="form-label">Username <span style={{color:'var(--red-500)'}}>*</span></label>
                    <input className="form-input" type="text" value={form.username} onChange={e => setForm(p=>({...p, username:e.target.value}))} placeholder="login username" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role <span style={{color:'var(--red-500)'}}>*</span></label>
                    <select className="form-select" value={form.role} onChange={e => setForm(p=>({...p, role:e.target.value}))}>
                      <option value="nurse">Nurse</option>
                      <option value="doctor">Doctor</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </>}
                <div className="form-group">
                  <label className="form-label">{editUser ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                  <input className="form-input" type="password" value={form.password} onChange={e => setForm(p=>({...p, password:e.target.value}))} placeholder="••••••••" required={!editUser} />
                </div>
                <div className="form-group">
                  <label className="form-label">Credential</label>
                  <input className="form-input" type="text" value={form.credential} onChange={e => setForm(p=>({...p, credential:e.target.value}))} placeholder="RN, MD, RMT…" />
                </div>
                <div className="form-group">
                  <label className="form-label">License No. (PRC)</label>
                  <input className="form-input" type="text" value={form.license_no} onChange={e => setForm(p=>({...p, license_no:e.target.value}))} placeholder="0000000" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner" style={{ width:16, height:16 }} /> Saving…</> : editUser ? '✓ Update' : '✓ Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.includes('Error') ? 'error' : 'success'}`}>{toast}</div>
        </div>
      )}
    </div>
  );
}
