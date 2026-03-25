'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { DashboardData } from '@/types';
import { useAuth } from '@/lib/auth';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function BarChart({ data, labels }: { data: number[]; labels: string[] }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, padding: '0 4px' }}>
      {data.map((val, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10, color: 'var(--slate-500)', fontWeight: 600 }}>{val || ''}</span>
          <div
            style={{
              width: '100%',
              height: `${(val / max) * 80}px`,
              minHeight: val > 0 ? 4 : 0,
              background: 'var(--teal-500)',
              borderRadius: '4px 4px 0 0',
              transition: 'height .4s ease',
            }}
          />
          <span style={{ fontSize: 10, color: 'var(--slate-400)' }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ segments, labels, colors }: { segments: number[]; labels: string[]; colors: string[] }) {
  const total = segments.reduce((a, b) => a + b, 0) || 1;
  let cumulative = 0;
  const size = 100, cx = 50, cy = 50, r = 38, strokeWidth = 14;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--slate-100)" strokeWidth={strokeWidth}/>
        {segments.map((seg, i) => {
          const pct = seg / total;
          const offset = circ * (1 - cumulative);
          const dash = circ * pct;
          cumulative += pct;
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={colors[i]} strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={offset}
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dasharray .4s' }}
            />
          );
        })}
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--slate-700)">{total}</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: colors[i], flexShrink: 0 }} />
            <span style={{ color: 'var(--slate-600)' }}>{labels[i]}</span>
            <span style={{ fontWeight: 700, color: 'var(--slate-800)' }}>{seg}</span>
            <span style={{ color: 'var(--slate-400)' }}>({total ? Math.round(seg/total*100) : 0}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear().toString());

  useEffect(() => { load(); }, [year]);

  async function load() {
    setLoading(true);
    const res = await api.getDashboard(year);
    if (res.status === 'ok') setData(res.data);
    setLoading(false);
  }

  if (loading) return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Dashboard</h1></div></div>
      <div className="page-loader"><div className="spinner" style={{ width: 32, height: 32 }} /><span>Loading dashboard…</span></div>
    </div>
  );

  if (!data) return null;

  const now = new Date().toLocaleDateString('en-PH', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  return (
    <div>
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{now}</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <select className="form-select" style={{ width: 100 }} value={year} onChange={e => setYear(e.target.value)}>
            {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={load}>↻ Refresh</button>
        </div>
      </div>

      <div className="page-body">
        {/* Alerts */}
        {(data.overdue_doses > 0 || data.due_today > 0) && (
          <div style={{ marginBottom: 20, display:'flex', flexDirection:'column', gap: 8 }}>
            {data.overdue_doses > 0 && (
              <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:'var(--radius-md)', padding:'10px 16px', color:'#991b1b', fontSize:14, display:'flex', alignItems:'center', gap: 10 }}>
                <span>⚠️</span> <strong>{data.overdue_doses} overdue dose{data.overdue_doses > 1 ? 's' : ''}</strong> — patients need immediate attention
              </div>
            )}
            {data.due_today > 0 && (
              <div style={{ background:'#fef3c7', border:'1px solid #fcd34d', borderRadius:'var(--radius-md)', padding:'10px 16px', color:'#92400e', fontSize:14, display:'flex', alignItems:'center', gap:10 }}>
                <span>📅</span> <strong>{data.due_today} dose{data.due_today > 1 ? 's' : ''} due today</strong> · {data.due_this_week} due this week
              </div>
            )}
          </div>
        )}

        {/* Main stats */}
        <div className="stat-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-value">{data.total_patients}</div>
            <div className="stat-label">Total Patients</div>
            <div className="stat-icon">👥</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-value">{data.active_treatment}</div>
            <div className="stat-label">Active Treatment</div>
            <div className="stat-icon">🩺</div>
          </div>
          <div className="stat-card green">
            <div className="stat-value">{data.completed}</div>
            <div className="stat-label">Completed</div>
            <div className="stat-icon">✅</div>
          </div>
          <div className="stat-card red">
            <div className="stat-value">{data.overdue_doses}</div>
            <div className="stat-label">Overdue Doses</div>
            <div className="stat-icon">⚠️</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-value">{data.erig_count}</div>
            <div className="stat-label">ERIG Given</div>
            <div className="stat-icon">💉</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-value">{data.hrig_count}</div>
            <div className="stat-label">HRIG Given</div>
            <div className="stat-icon">💉</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{data.due_today}</div>
            <div className="stat-label">Due Today</div>
            <div className="stat-icon">📅</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{data.pet_monitors_active}</div>
            <div className="stat-label">Pet Monitors Active</div>
            <div className="stat-icon">🐾</div>
          </div>
        </div>

        {/* Charts row */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:16, marginBottom:20 }}>

          {/* Monthly cases */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Monthly Cases — {year}</span>
            </div>
            <div className="card-body">
              <BarChart data={data.monthly} labels={MONTHS} />
            </div>
          </div>

          {/* Animal type */}
          <div className="card">
            <div className="card-header"><span className="card-title">Animal Type</span></div>
            <div className="card-body">
              <DonutChart
                segments={[data.animal_counts.dog, data.animal_counts.cat, data.animal_counts.bat, data.animal_counts.other]}
                labels={['Dog','Cat','Bat','Other']}
                colors={['#14b8a6','#3b82f6','#8b5cf6','#f59e0b']}
              />
            </div>
          </div>

          {/* Sex distribution */}
          <div className="card">
            <div className="card-header"><span className="card-title">Sex Distribution</span></div>
            <div className="card-body">
              <DonutChart
                segments={[data.male_count, data.female_count]}
                labels={['Male','Female']}
                colors={['#3b82f6','#ec4899']}
              />
            </div>
          </div>
        </div>

        {/* Second row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:20 }}>

          {/* Exposure category */}
          <div className="card">
            <div className="card-header"><span className="card-title">Exposure Category</span></div>
            <div className="card-body">
              <DonutChart
                segments={[data.cat1, data.cat2, data.cat3]}
                labels={['Category I','Category II','Category III']}
                colors={['#22c55e','#f59e0b','#ef4444']}
              />
            </div>
          </div>

          {/* Age group */}
          <div className="card">
            <div className="card-header"><span className="card-title">Age Groups</span></div>
            <div className="card-body">
              <DonutChart
                segments={[data.age_lt15, data.age_15, data.age_gt15]}
                labels={['< 15 yrs','15 yrs','> 15 yrs']}
                colors={['#a78bfa','#14b8a6','#0d9488']}
              />
            </div>
          </div>

          {/* ERIG / HRIG */}
          <div className="card">
            <div className="card-header"><span className="card-title">ERIG / HRIG</span></div>
            <div className="card-body">
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {[
                  { label: 'ERIG (Equine)', count: data.erig_count, color: '#14b8a6', total: data.erig_count + data.hrig_count },
                  { label: 'HRIG (Human)', count: data.hrig_count, color: '#3b82f6', total: data.erig_count + data.hrig_count },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:5 }}>
                      <span style={{ color:'var(--slate-600)' }}>{item.label}</span>
                      <span style={{ fontWeight:700 }}>{item.count}</span>
                    </div>
                    <div style={{ background:'var(--slate-100)', borderRadius: 4, height: 8 }}>
                      <div style={{ width: `${item.total ? item.count/item.total*100 : 0}%`, background: item.color, height: '100%', borderRadius:4, transition:'width .4s' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Activity</span>
          </div>
          <div className="table-wrap">
            {data.recent_activity.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="empty-text">No recent activity</div>
              </div>
            ) : (
              <table className="data-table">
                <thead><tr>
                  <th>Time</th><th>Action</th><th>User</th><th>Details</th>
                </tr></thead>
                <tbody>
                  {data.recent_activity.map(log => (
                    <tr key={log.log_id}>
                      <td style={{ fontSize: 12, color:'var(--slate-500)', whiteSpace:'nowrap' }}>
                        {new Date(log.timestamp).toLocaleString('en-PH', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                      </td>
                      <td>
                        <span style={{ fontSize:13, fontWeight:500, color:'var(--teal-700)' }}>
                          {log.action.replace(/_/g,' ')}
                        </span>
                      </td>
                      <td style={{ fontSize:13 }}>{log.user_id}</td>
                      <td style={{ fontSize:12, color:'var(--slate-500)' }}>
                        {typeof log.details === 'string' ? (() => { try { const d = JSON.parse(log.details); return d.full_name || d.patient_id || ''; } catch { return log.details; } })() : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
