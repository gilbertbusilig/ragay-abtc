'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Dose } from '@/types';

function fmtDate(d: string) {
  if (!d) return '—';
  const clean = String(d).includes('T') ? d.split('T')[0] : d;
  if (!clean) return '—';
  const [y, m, dd] = clean.split('-');
  return `${m}/${dd}/${y}`;
}

function getLocalISODate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function VaccineSchedulePage() {
  const router = useRouter();
  const [doses, setDoses] = useState<(Dose & { patient_name?: string })[]>([]);
  const [userMap, setUserMap] = useState<Record<string, { full_name?: string; credential?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const today = getLocalISODate();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [dosesRes, patientsRes, initRes] = await Promise.all([
      api.getDoses(),
      api.getPatients(),
      api.getInitData(),
    ]);
    if (dosesRes.status === 'ok' && patientsRes.status === 'ok') {
      const patMap: Record<string, string> = {};
      patientsRes.data.forEach((p: any) => { patMap[p.patient_id] = p.full_name; });
      setDoses(dosesRes.data.map((d: Dose) => ({ ...d, patient_name: patMap[d.patient_id] || d.patient_id })));
    }
    if (initRes.status === 'ok') {
      const map: Record<string, { full_name?: string; credential?: string }> = {};
      (initRes.data.accounts || []).forEach((u: any) => { map[u.user_id] = u; });
      (initRes.data.nurses || []).forEach((u: any) => { if (!map[u.user_id]) map[u.user_id] = u; });
      setUserMap(map);
    }
    setLoading(false);
  }

  function givenByName(userId?: string) {
    if (!userId) return '—';
    const u = userMap[userId];
    if (!u?.full_name) return userId;
    return `${u.full_name}${u.credential ? `, ${u.credential}` : ''}`;
  }

  const activeDoses = doses.filter(d => String(d.status || '').toLowerCase() !== 'skipped');

  const filtered = activeDoses.filter(d => {
    if (filter === 'due_today') return d.scheduled_date === today && d.status === 'scheduled';
    if (filter === 'due_week') {
      const wk = new Date(); wk.setDate(wk.getDate() + 7);
      const wkStr = (() => { const y = wk.getFullYear(); const m = String(wk.getMonth()+1).padStart(2,'0'); const d = String(wk.getDate()).padStart(2,'0'); return `${y}-${m}-${d}`; })();
      return d.scheduled_date >= today && d.scheduled_date <= wkStr && d.status === 'scheduled';
    }
    if (filter === 'overdue') return d.status === 'overdue';
    if (filter === 'done') return d.status === 'done';
    if (filter === 'scheduled') return d.status === 'scheduled';
    return true;
  }).sort((a, b) => (a.scheduled_date || '').localeCompare(b.scheduled_date || ''));

  const counts = {
    due_today: activeDoses.filter(d => d.scheduled_date === today && d.status === 'scheduled').length,
    overdue: activeDoses.filter(d => d.status === 'overdue').length,
    done: activeDoses.filter(d => d.status === 'done').length,
  };

  const statusBadge = (s: string, optional: boolean) => {
    if (optional && s === 'scheduled') return <span className="badge" style={{ background:'#f1f5f9', color:'var(--slate-400)' }}>Optional</span>;
    const map: Record<string, string> = { done:'badge-done', scheduled:'badge-scheduled', overdue:'badge-overdue' };
    return <span className={`badge ${map[s] || ''}`}>{s}</span>;
  };

  const isUrgent = (d: Dose) => d.status === 'overdue' || (d.status === 'scheduled' && d.scheduled_date <= today);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Vaccine Schedule</h1>
          <p className="page-subtitle">PEP & PrEP dose tracking for all patients</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load}>↻ Refresh</button>
      </div>

      <div className="page-body">
        {/* Summary cards */}
        <div className="stat-grid" style={{ marginBottom:16 }}>
          <div className="stat-card red">
            <div className="stat-value">{counts.overdue}</div>
            <div className="stat-label">Overdue Doses</div>
            <div className="stat-icon">⚠️</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-value">{counts.due_today}</div>
            <div className="stat-label">Due Today</div>
            <div className="stat-icon">📅</div>
          </div>
          <div className="stat-card green">
            <div className="stat-value">{counts.done}</div>
            <div className="stat-label">Doses Given</div>
            <div className="stat-icon">✅</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{activeDoses.length}</div>
            <div className="stat-label">Total Scheduled</div>
            <div className="stat-icon">💉</div>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
          {[
            { val:'all', label:'All Doses' },
            { val:'due_today', label:'Due Today', urgent: counts.due_today > 0 },
            { val:'due_week', label:'Due This Week' },
            { val:'overdue', label:'Overdue', urgent: counts.overdue > 0 },
            { val:'scheduled', label:'Upcoming' },
            { val:'done', label:'Completed' },
          ].map(tab => (
            <button key={tab.val}
              className={`btn btn-sm ${filter === tab.val ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(tab.val)}
              style={{ position:'relative' }}>
              {tab.label}
              {(tab as any).urgent && <span style={{ position:'absolute', top:-4, right:-4, width:8, height:8, background:'var(--red-500)', borderRadius:'50%' }} />}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card">
          {loading ? (
            <div className="page-loader" style={{ minHeight:300 }}>
              <div className="spinner" style={{ width:28, height:28 }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💉</div>
              <div className="empty-text">No doses in this category</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>Patient ID</th>
                  <th>Patient</th>
                  <th>Day</th>
                  <th>Scheduled Date</th>
                  <th>Status</th>
                  <th>Vaccine</th>
                  <th>Brand</th>
                  <th>Date Given</th>
                  <th>Given By</th>
                </tr></thead>
                <tbody>
                  {filtered.map(d => (
                    <tr key={d.dose_id}
                      style={{ background: isUrgent(d) ? '#fff8f8' : undefined, cursor:'pointer' }}
                      onClick={() => router.push(`/patients/${d.patient_id}`)}>
                      <td><span style={{ fontFamily:'monospace', fontSize:12, color:'var(--blue-700)' }}>{d.patient_id}</span></td>
                      <td>
                        <span style={{ fontWeight:500, color: isUrgent(d) ? 'var(--red-700)' : undefined }}>
                          {(d as any).patient_name}
                        </span>
                      </td>
                      <td><span style={{ fontWeight:700, color:'var(--blue-700)' }}>{d.dose_day}</span></td>
                      <td style={{ fontSize:13 }}>
                        {fmtDate(d.scheduled_date)}
                        {d.scheduled_date < today && d.status !== 'done' && (
                          <span style={{ marginLeft:6, fontSize:11, color:'var(--red-600)', fontWeight:600 }}>
                            ({Math.abs(Math.round((new Date(d.scheduled_date).getTime() - new Date(today).getTime()) / 86400000))}d late)
                          </span>
                        )}
                      </td>
                      <td>{statusBadge(d.status, d.is_optional)}</td>
                      <td style={{ fontSize:13 }}>{d.vaccine_type || '—'}</td>
                      <td style={{ fontSize:13 }}>{d.brand_name || '—'}</td>
                      <td style={{ fontSize:13 }}>{fmtDate(d.administered_date)}</td>
                      <td style={{ fontSize:13 }}>{givenByName(d.administered_by)}</td>
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
