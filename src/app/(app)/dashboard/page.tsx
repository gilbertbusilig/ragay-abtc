'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { DashboardData } from '@/types';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function BarChart({ data, labels }: { data: number[]; labels: string[] }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:5, height:110, padding:'0 4px' }}>
      {data.map((val, i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
          <span style={{ fontSize:9, color:'var(--slate-500)', fontWeight:600, minHeight:12 }}>{val||''}</span>
          <div style={{ width:'100%', height:`${Math.max((val/max)*88, val>0?3:0)}px`, background:'var(--blue-500)', borderRadius:'3px 3px 0 0', transition:'height .4s ease', minHeight: val>0?3:0 }} />
          <span style={{ fontSize:9, color:'var(--slate-400)' }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ segments, labels, colors }: { segments:number[]; labels:string[]; colors:string[] }) {
  const total = segments.reduce((a,b)=>a+b,0)||1;
  let cumulative = 0;
  const r = 36, circ = 2*Math.PI*r, sw = 13;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:16 }}>
      <svg width="88" height="88" viewBox="0 0 88 88" style={{ flexShrink:0 }}>
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--slate-100)" strokeWidth={sw}/>
        {segments.map((seg,i)=>{
          const pct=seg/total, offset=circ*(1-cumulative), dash=circ*pct;
          cumulative+=pct;
          return <circle key={i} cx="44" cy="44" r={r} fill="none" stroke={colors[i]} strokeWidth={sw}
            strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={offset}
            style={{ transform:'rotate(-90deg)', transformOrigin:'50% 50%', transition:'stroke-dasharray .4s' }}/>;
        })}
        <text x="44" y="48" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--slate-700)">{total}</text>
      </svg>
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {segments.map((seg,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12 }}>
            <div style={{ width:9, height:9, borderRadius:2, background:colors[i], flexShrink:0 }}/>
            <span style={{ color:'var(--slate-600)' }}>{labels[i]}</span>
            <span style={{ fontWeight:700, color:'var(--slate-800)' }}>{seg}</span>
            <span style={{ color:'var(--slate-400)', fontSize:11 }}>({Math.round(seg/total*100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const ACTION_LABELS: Record<string,string> = {
  created_patient:  '🆕 New patient registered',
  updated_patient:  '✏️ Patient info updated',
  created_incident: '🩺 New bite incident',
  updated_incident: '📋 Incident updated',
  administered_dose:'💉 Dose administered',
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData|null>(null);
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
      <div className="page-loader"><div className="spinner dark" style={{ width:28, height:28 }}/><span style={{ color:'var(--slate-400)' }}>Loading dashboard…</span></div>
    </div>
  );

  if (!data) return null;

  const now = new Date().toLocaleDateString('en-PH',{ weekday:'long', year:'numeric', month:'long', day:'numeric' });

  return (
    <div>
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{now}</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <select className="form-select" style={{ width:96 }} value={year} onChange={e=>setYear(e.target.value)}>
            {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={load}>↻ Refresh</button>
        </div>
      </div>

      <div className="page-body">
        {/* Alerts */}
        {data.overdue_doses > 0 && (
          <div className="alert alert-red" style={{ marginBottom:8 }}>
            <span>⚠️</span> <strong>{data.overdue_doses} overdue dose{data.overdue_doses>1?'s':''}</strong> — patients need immediate follow-up
          </div>
        )}
        {data.due_today > 0 && (
          <div className="alert alert-amber" style={{ marginBottom:14 }}>
            <span>📅</span> <strong>{data.due_today} dose{data.due_today>1?'s':''} due today</strong> · {data.due_this_week} due this week
          </div>
        )}

        {/* Main stat cards */}
        <div className="stat-grid" style={{ marginBottom:16 }}>
          {[
            { val:data.total_patients,   label:'Total Patients',      icon:'👥', cls:'' },
            { val:data.active_treatment, label:'Active Treatment',    icon:'🩺', cls:'amber' },
            { val:data.completed,        label:'Completed',           icon:'✅', cls:'green' },
            { val:data.overdue_doses,    label:'Overdue Doses',       icon:'⚠️', cls:'red' },
            { val:data.erig_count,       label:'ERIG Given',          icon:'💉', cls:'' },
            { val:data.hrig_count,       label:'HRIG Given',          icon:'💉', cls:'' },
            { val:data.due_today,        label:'Due Today',           icon:'📅', cls:'' },
            { val:data.pet_monitors_active, label:'Pet Monitors',     icon:'🐾', cls:'' },
          ].map(s=>(
            <div key={s.label} className={`stat-card ${s.cls}`}>
              <div className="stat-value">{s.val}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-icon">{s.icon}</div>
            </div>
          ))}
        </div>

        {/* Charts row 1 */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:14, marginBottom:14 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Monthly Cases — {year}</span></div>
            <div className="card-body"><BarChart data={data.monthly} labels={MONTHS}/></div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Animal Type</span></div>
            <div className="card-body">
              <DonutChart
                segments={[data.animal_counts.dog,data.animal_counts.cat,data.animal_counts.bat,data.animal_counts.other]}
                labels={['Dog','Cat','Bat','Other']}
                colors={['#2563eb','#7c3aed','#db2777','#d97706']}/>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Sex</span></div>
            <div className="card-body">
              <DonutChart
                segments={[data.male_count,data.female_count]}
                labels={['Male','Female']}
                colors={['#2563eb','#ec4899']}/>
            </div>
          </div>
        </div>

        {/* Charts row 2 */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:14 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Exposure Category</span></div>
            <div className="card-body">
              <DonutChart
                segments={[data.cat1,data.cat2,data.cat3]}
                labels={['Category I','Category II','Category III']}
                colors={['#22c55e','#f59e0b','#ef4444']}/>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Age Groups</span></div>
            <div className="card-body">
              <DonutChart
                segments={[data.age_lt15,data.age_15,data.age_gt15]}
                labels={['Under 15','15 yrs','Over 15']}
                colors={['#a78bfa','#2563eb','#1d4ed8']}/>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">ERIG / HRIG</span></div>
            <div className="card-body">
              {[
                { label:'ERIG (Equine)', count:data.erig_count, color:'#2563eb' },
                { label:'HRIG (Human)',  count:data.hrig_count, color:'#7c3aed' },
              ].map(item=>{
                const total = data.erig_count+data.hrig_count||1;
                return (
                  <div key={item.label} style={{ marginBottom:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:5 }}>
                      <span style={{ color:'var(--slate-600)' }}>{item.label}</span>
                      <span style={{ fontWeight:700 }}>{item.count}</span>
                    </div>
                    <div style={{ background:'var(--slate-100)', borderRadius:4, height:8 }}>
                      <div style={{ width:`${item.count/total*100}%`, background:item.color, height:'100%', borderRadius:4, transition:'width .4s' }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent patient activity */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Patient Activity</span>
            <span style={{ fontSize:12, color:'var(--slate-400)' }}>Latest 20 patient-related events</span>
          </div>
          <div className="table-wrap">
            {!data.recent_activity || data.recent_activity.length === 0 ? (
              <div className="empty-state" style={{ padding:36 }}>
                <div className="empty-icon">📋</div>
                <div className="empty-text">No patient activity yet</div>
                <div className="empty-sub">Activity will appear as patients are registered and treated</div>
              </div>
            ) : (
              <table className="data-table">
                <thead><tr>
                  <th style={{ width:110 }}>Time</th>
                  <th>Activity</th>
                  <th style={{ width:120 }}>Patient ID</th>
                  <th>Details</th>
                </tr></thead>
                <tbody>
                  {(data.recent_activity as any[]).map((log,i) => {
                    let details = '';
                    try {
                      const d = JSON.parse(log.details||'{}');
                      details = d.full_name || (d.wound_category ? `Category ${d.wound_category}` : '') || d.fields?.join(', ') || '';
                    } catch { details = String(log.details||''); }
                    return (
                      <tr key={log.log_id||i}>
                        <td style={{ fontSize:11, color:'var(--slate-500)', whiteSpace:'nowrap' }}>
                          {new Date(log.timestamp).toLocaleString('en-PH',{ month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                        </td>
                        <td>
                          <span style={{ fontSize:13, fontWeight:500, color:'var(--blue-700)' }}>
                            {ACTION_LABELS[log.action] || log.action?.replace(/_/g,' ')}
                          </span>
                        </td>
                        <td style={{ fontSize:12, fontFamily:'monospace', color:'var(--blue-600)', fontWeight:600 }}>
                          {log.patient_id || log.target_id || '—'}
                        </td>
                        <td style={{ fontSize:12, color:'var(--slate-500)' }}>{details}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
