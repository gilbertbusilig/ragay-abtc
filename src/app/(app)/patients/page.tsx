'use client';
import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Patient } from '@/types';
import { useAuth } from '@/lib/auth';

export default function PatientsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [animalFilter, setAnimalFilter] = useState('');
  const [ageFilter, setAgeFilter] = useState('');
  const [sexFilter, setSexFilter] = useState('');
  const [incidentFilter, setIncidentFilter] = useState('');
  const searchTimer = useRef<NodeJS.Timeout>();
  const loadSeq = useRef(0);

  useEffect(() => { load(); }, [statusFilter, categoryFilter]);
  useEffect(() => () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
  }, []);

  async function load(q?: string, filters = { status: statusFilter, category: categoryFilter }) {
    const seq = ++loadSeq.current;
    setLoading(true);
    const params: Record<string, string> = {};
    if (q !== undefined) params.search = q;
    else if (search) params.search = search;
    if (filters.status) params.status = filters.status;
    if (filters.category) params.category = filters.category;
    const res = await api.getPatients(params);
    if (seq !== loadSeq.current) return;
    if (res.status === 'ok') setAllPatients(res.data);
    setLoading(false);
  }

  function handleSearch(val: string) {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(val), 400);
  }

  function clearAllFilters() {
    setSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setAnimalFilter('');
    setAgeFilter('');
    setSexFilter('');
    setIncidentFilter('');
    load('', { status: '', category: '' });
  }

  const hasFilters = search || statusFilter || categoryFilter || animalFilter || ageFilter || sexFilter || incidentFilter;
  const escapeHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // Client-side filtering for animal, age, sex, incident count
  const patients = useMemo(() => allPatients.filter(p => {
    if (animalFilter && String(p.latest_animal_type || '').toLowerCase() !== animalFilter) return false;
    if (sexFilter && String(p.sex || '').toUpperCase() !== sexFilter) return false;
    if (ageFilter) {
      const age = Number(p.age);
      if (ageFilter === 'under15' && !(age < 15)) return false;
      if (ageFilter === '15' && age !== 15) return false;
      if (ageFilter === 'over15' && !(age > 15)) return false;
    }
    if (incidentFilter) {
      const count = Number(p.incident_count || 0);
      if (incidentFilter === '1' && count !== 1) return false;
      if (incidentFilter === '2' && count !== 2) return false;
      if (incidentFilter === '3+' && count < 3) return false;
    }
    return true;
  }), [allPatients, animalFilter, ageFilter, sexFilter, incidentFilter]);

  const catBadge = (cat: string) => {
    if (!cat) return null;
    const cls = cat === 'I' ? 'badge-cat1' : cat === 'II' ? 'badge-cat2' : 'badge-cat3';
    return <span className={`badge ${cls}`}>Cat {cat}</span>;
  };

  const statusBadge = (s: string) => {
    const cls = s === 'active' ? 'badge-active' : s === 'completed' ? 'badge-completed' : 'badge-overdue';
    return <span className={`badge ${cls}`}>{s}</span>;
  };

  function handlePrintRecords() {
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) return;

    const rows = patients.map(p => `
      <tr>
        <td>${escapeHtml(p.patient_id || '-')}</td>
        <td>${escapeHtml(p.full_name || '-')}</td>
        <td>${escapeHtml(String(p.age ?? '-'))}</td>
        <td>${escapeHtml(p.sex === 'M' ? 'Male' : p.sex === 'F' ? 'Female' : '-')}</td>
        <td>${escapeHtml(p.address || '-')}</td>
        <td>${escapeHtml(String(p.incident_count || 0))}</td>
        <td>${escapeHtml(p.latest_category ? `Cat ${p.latest_category}` : '-')}</td>
        <td>${escapeHtml(p.status || '-')}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Patient Records</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 6px; font-size: 24px; }
            p { margin: 0 0 18px; color: #475569; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-size: 12px; }
            th { background: #eff6ff; color: #1d4ed8; text-transform: uppercase; font-size: 10px; letter-spacing: .06em; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Patient Records</h1>
          <p>${escapeHtml(`${patients.length} patient${patients.length !== 1 ? 's' : ''} found`)}</p>
          <table>
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Full Name</th>
                <th>Age</th>
                <th>Sex</th>
                <th>Address</th>
                <th>Incidents</th>
                <th>Category</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div>
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Patient Records</h1>
          <p className="page-subtitle">{patients.length} patient{patients.length !== 1 ? 's' : ''} found</p>
        </div>
        <div style={{ display:'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={handlePrintRecords}>🖨 Print</button>
          <button className="btn btn-secondary btn-sm" onClick={() => api.exportCSV({ status: statusFilter })}>📥 Export CSV</button>
          <button className="btn btn-primary" onClick={() => router.push('/patients/new')}>
            + New Patient
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Filter bar */}
        <div className="card no-print" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ padding: '14px 18px' }}>
            {/* Row 1: search + status + category + clear */}
            <div className="filter-bar" style={{ marginBottom: 10 }}>
              <div className="search-input-wrap" style={{ flex: 2 }}>
                <span className="search-icon">🔍</span>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Search by name or Patient ID…"
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                />
              </div>
              <select className="form-select" style={{ width: 140 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); }}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
              <select className="form-select" style={{ width: 150 }} value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); }}>
                <option value="">All Categories</option>
                <option value="I">Category I</option>
                <option value="II">Category II</option>
                <option value="III">Category III</option>
              </select>
              {hasFilters && (
                <button className="btn btn-ghost btn-sm" onClick={clearAllFilters}>✕ Clear</button>
              )}
            </div>

            {/* Row 2: animal + age + sex + incidents */}
            <div className="filter-bar">
              <select className="form-select" style={{ flex: 1 }} value={animalFilter} onChange={e => setAnimalFilter(e.target.value)}>
                <option value="">All Animal Types</option>
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
                <option value="bat">Bat</option>
                <option value="other">Other</option>
              </select>
              <select className="form-select" style={{ flex: 1 }} value={ageFilter} onChange={e => setAgeFilter(e.target.value)}>
                <option value="">All Age Groups</option>
                <option value="under15">Under 15</option>
                <option value="15">15 years old</option>
                <option value="over15">Over 15</option>
              </select>
              <select className="form-select" style={{ flex: 1 }} value={sexFilter} onChange={e => setSexFilter(e.target.value)}>
                <option value="">All Sex</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
              <select className="form-select" style={{ flex: 1 }} value={incidentFilter} onChange={e => setIncidentFilter(e.target.value)}>
                <option value="">All Incidents</option>
                <option value="1">1 Incident</option>
                <option value="2">2 Incidents</option>
                <option value="3+">3+ Incidents</option>
              </select>
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
