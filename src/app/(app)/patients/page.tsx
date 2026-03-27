'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Patient } from '@/types';
import { useAuth } from '@/lib/auth';

export default function PatientsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const searchTimer = useRef<NodeJS.Timeout>();

  useEffect(() => { load(); }, [statusFilter, categoryFilter]);

  async function load(q?: string) {
    setLoading(true);
    const params: Record<string, string> = {};
    if (q !== undefined) params.search = q;
    else if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (categoryFilter) params.category = categoryFilter;
    const res = await api.getPatients(params);
    if (res.status === 'ok') setPatients(res.data);
    setLoading(false);
  }

  function handleSearch(val: string) {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(val), 400);
  }

  function handlePrint() { window.print(); }

  function handleExport() { api.exportCSV({ status: statusFilter }); }

  const catBadge = (cat: string) => {
    if (!cat) return null;
    const cls = cat === 'I' ? 'badge-cat1' : cat === 'II' ? 'badge-cat2' : 'badge-cat3';
    return <span className={`badge ${cls}`}>Cat {cat}</span>;
  };

  const statusBadge = (s: string) => {
    const cls = s === 'active' ? 'badge-active' : s === 'completed' ? 'badge-completed' : 'badge-overdue';
    return <span className={`badge ${cls}`}>{s}</span>;
  };

  return (
    <div>
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Patient Records</h1>
          <p className="page-subtitle">{patients.length} patient{patients.length !== 1 ? 's' : ''} found</p>
        </div>
        <div style={{ display:'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}>🖨 Print</button>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>📥 Export CSV</button>
          <button className="btn btn-primary" onClick={() => router.push('/patients/new')}>
            + New Patient
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Filter bar */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ padding: '14px 18px' }}>
            <div className="filter-bar">
              <div className="search-input-wrap" style={{ flex: 2 }}>
                <span className="search-icon">🔍</span>
                <input className="form-input" type="text" placeholder="Search by name or Patient ID…" value={search} onChange={e => handleSearch(e.target.value)} />
              </div>
              <select className="form-select" style={{ width: 150 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
              <select className="form-select" style={{ width: 160 }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                <option value="">All Categories</option>
                <option value="I">Category I</option>
                <option value="II">Category II</option>
                <option value="III">Category III</option>
              </select>
              {(search || statusFilter || categoryFilter) && (
                <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setStatusFilter(''); setCategoryFilter(''); load(''); }}>
                  ✕ Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          {loading ? (
            <div className="page-loader" style={{ minHeight: 300 }}>
              <div className="spinner" style={{ width: 28, height: 28 }} />
              <span style={{ color: 'var(--slate-400)' }}>Loading patients…</span>
            </div>
          ) : patients.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🗂️</div>
              <div className="empty-text">No patients found</div>
              <div className="empty-sub">Try adjusting your search or filters</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>Patient ID</th>
                  <th>Full Name</th>
                  <th>Age</th>
                  <th>Sex</th>
                  <th>Address</th>
                  <th>Incidents</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr></thead>
                <tbody>
                  {patients.map(p => (
                    <tr key={p.patient_id} style={{ cursor:'pointer' }} onClick={() => router.push(`/patients/${p.patient_id}`)}>
                      <td>
                        <span style={{ fontFamily:'monospace', fontSize:13, color:'var(--blue-700)', fontWeight:600 }}>{p.patient_id}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight:500 }}>{p.full_name}</span>
                      </td>
                      <td>{p.age}</td>
                      <td>{p.sex === 'M' ? '♂ Male' : p.sex === 'F' ? '♀ Female' : '—'}</td>
                      <td style={{ maxWidth: 180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:13, color:'var(--slate-500)' }}>
                        {p.address || '—'}
                      </td>
                      <td>
                        <span style={{ background:'var(--blue-50)', color:'var(--blue-700)', padding:'2px 8px', borderRadius:12, fontSize:12, fontWeight:600 }}>
                          {p.incident_count || 0}
                        </span>
                      </td>
                      <td>{catBadge(p.latest_category || '')}</td>
                      <td>{statusBadge(p.status)}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/patients/${p.patient_id}`)}>View</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/patients/${p.patient_id}/print`)}>🖨</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
