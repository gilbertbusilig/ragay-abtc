'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { DashboardData } from '@/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatSheetDate(value?: string) {
  if (!value) return '-';
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function BarChart({ data, labels }: { data: number[]; labels: string[] }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 110, padding: '0 4px' }}>
      {data.map((val, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <span style={{ fontSize: 9, color: 'var(--slate-500)', fontWeight: 600, minHeight: 12 }}>{val || ''}</span>
          <div
            style={{
              width: '100%',
              height: `${Math.max((val / max) * 88, val > 0 ? 3 : 0)}px`,
              background: 'var(--blue-500)',
              borderRadius: '3px 3px 0 0',
              transition: 'height .4s ease',
              minHeight: val > 0 ? 3 : 0,
            }}
          />
          <span style={{ fontSize: 9, color: 'var(--slate-400)' }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ segments, labels, colors }: { segments: number[]; labels: string[]; colors: string[] }) {
  const total = segments.reduce((a, b) => a + b, 0) || 1;
  let cumulative = 0;
  const r = 36;
  const circ = 2 * Math.PI * r;
  const sw = 13;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width="88" height="88" viewBox="0 0 88 88" style={{ flexShrink: 0 }}>
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--slate-100)" strokeWidth={sw} />
        {segments.map((seg, i) => {
          const pct = seg / total;
          const offset = circ * (1 - cumulative);
          const dash = circ * pct;
          cumulative += pct;
          return (
            <circle
              key={i}
              cx="44"
              cy="44"
              r={r}
              fill="none"
              stroke={colors[i]}
              strokeWidth={sw}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={offset}
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dasharray .4s' }}
            />
          );
        })}
        <text x="44" y="48" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--slate-700)">
          {total}
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
            <div style={{ width: 9, height: 9, borderRadius: 2, background: colors[i], flexShrink: 0 }} />
            <span style={{ color: 'var(--slate-600)' }}>{labels[i]}</span>
            <span style={{ fontWeight: 700, color: 'var(--slate-800)' }}>{seg}</span>
            <span style={{ color: 'var(--slate-400)', fontSize: 11 }}>({Math.round((seg / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type AgeFilter = 'all' | 'under15' | '15' | 'over15';
type SexFilter = 'all' | 'male' | 'female';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('all');
  const [sexFilter, setSexFilter] = useState<SexFilter>('all');

  useEffect(() => {
    load();
  }, [year]);

  async function load() {
    setLoading(true);
    const res = await api.getDashboard(year);
    if (res.status === 'ok') setData(res.data);
    setLoading(false);
  }

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
          </div>
        </div>
        <div className="page-loader">
          <div className="spinner dark" style={{ width: 28, height: 28 }} />
          <span style={{ color: 'var(--slate-400)' }}>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const now = new Date().toLocaleDateString('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const ageCounts: Record<Exclude<AgeFilter, 'all'>, number> = {
    under15: data.age_lt15,
    '15': data.age_15,
    over15: data.age_gt15,
  };

  const sexCounts: Record<Exclude<SexFilter, 'all'>, number> = {
    male: data.male_count,
    female: data.female_count,
  };

  const filteredCount = (() => {
    const total = data.total_patients || 0;
    const ageCount = ageFilter === 'all' ? total : ageCounts[ageFilter];
    const sexCount = sexFilter === 'all' ? total : sexCounts[sexFilter];
    if (ageFilter === 'all' && sexFilter === 'all') return total;
    if (ageFilter === 'all') return sexCount;
    if (sexFilter === 'all') return ageCount;
    return Math.min(ageCount, sexCount);
  })();

  return (
    <div>
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{now}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="form-select" style={{ width: 96 }} value={year} onChange={e => setYear(e.target.value)}>
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      <div className="page-body">
        {data.overdue_doses > 0 && (
          <div className="alert alert-red" style={{ marginBottom: 8 }}>
            <strong>{data.overdue_doses} overdue dose{data.overdue_doses > 1 ? 's' : ''}</strong> patients need immediate follow-up
          </div>
        )}
        {data.due_today > 0 && (
          <div className="alert alert-amber" style={{ marginBottom: 14 }}>
            <strong>{data.due_today} dose{data.due_today > 1 ? 's' : ''} due today</strong> · {data.due_this_week} due this week
          </div>
        )}

        <div className="stat-grid" style={{ marginBottom: 16 }}>
          {[
            { val: data.total_patients, label: 'Total Patients', icon: 'People', cls: '' },
            { val: data.active_treatment, label: 'Active Treatment', icon: 'ABTC', cls: 'amber' },
            { val: data.completed, label: 'Completed', icon: 'Done', cls: 'green' },
            { val: data.overdue_doses, label: 'Overdue Doses', icon: 'Alert', cls: 'red' },
            { val: data.erig_count, label: 'ERIG Given', icon: 'ERIG', cls: '' },
            { val: data.hrig_count, label: 'HRIG Given', icon: 'HRIG', cls: '' },
            { val: data.due_today, label: 'Due Today', icon: 'Today', cls: '' },
            { val: data.pet_monitors_active, label: 'Pet Monitors', icon: 'Monitor', cls: '' },
          ].map(s => (
            <div key={s.label} className={`stat-card ${s.cls}`}>
              <div className="stat-value">{s.val}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-icon">{s.icon}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Monthly Cases - {year}</span>
            </div>
            <div className="card-body">
              <BarChart data={data.monthly} labels={MONTHS} />
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Animal Type</span>
            </div>
            <div className="card-body">
              <DonutChart
                segments={[data.animal_counts.dog, data.animal_counts.cat, data.animal_counts.bat, data.animal_counts.other]}
                labels={['Dog', 'Cat', 'Bat', 'Other']}
                colors={['#2563eb', '#7c3aed', '#db2777', '#d97706']}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 14, marginBottom: 14 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Exposure Category</span>
            </div>
            <div className="card-body">
              <DonutChart
                segments={[data.cat1, data.cat2, data.cat3]}
                labels={['Category I', 'Category II', 'Category III']}
                colors={['#22c55e', '#f59e0b', '#ef4444']}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Patient Demographics</span>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-500)', marginBottom: 8 }}>Age Groups</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      ['Under 15', data.age_lt15, '#a78bfa'],
                      ['15 yrs', data.age_15, '#2563eb'],
                      ['Over 15', data.age_gt15, '#1d4ed8'],
                    ].map(([label, count, color]) => (
                      <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 999, background: String(color) }} />
                          <span style={{ color: 'var(--slate-600)' }}>{label}</span>
                        </div>
                        <strong style={{ color: 'var(--slate-800)' }}>{count}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-500)', marginBottom: 8 }}>Sex</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      ['Male', data.male_count, '#2563eb'],
                      ['Female', data.female_count, '#ec4899'],
                    ].map(([label, count, color]) => (
                      <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 999, background: String(color) }} />
                          <span style={{ color: 'var(--slate-600)' }}>{label}</span>
                        </div>
                        <strong style={{ color: 'var(--slate-800)' }}>{count}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--slate-500)', marginBottom: 6 }}>
                    Age Group Filter
                  </label>
                  <select className="form-select" value={ageFilter} onChange={e => setAgeFilter(e.target.value as AgeFilter)}>
                    <option value="all">All Ages</option>
                    <option value="under15">Under 15</option>
                    <option value="15">15 yrs</option>
                    <option value="over15">Over 15</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--slate-500)', marginBottom: 6 }}>
                    Sex Filter
                  </label>
                  <select className="form-select" value={sexFilter} onChange={e => setSexFilter(e.target.value as SexFilter)}>
                    <option value="all">All Sex</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 14, padding: '12px 14px', border: '1px solid var(--slate-200)', borderRadius: 12, background: 'var(--slate-50)' }}>
                <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>Filtered patient count</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--slate-800)', lineHeight: 1.1 }}>{filteredCount}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">ERIG / HRIG</span>
            </div>
            <div className="card-body">
              {[
                { label: 'ERIG (Equine)', count: data.erig_count, color: '#2563eb' },
                { label: 'HRIG (Human)', count: data.hrig_count, color: '#7c3aed' },
              ].map(item => {
                const total = data.erig_count + data.hrig_count || 1;
                return (
                  <div key={item.label} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                      <span style={{ color: 'var(--slate-600)' }}>{item.label}</span>
                      <span style={{ fontWeight: 700 }}>{item.count}</span>
                    </div>
                    <div style={{ background: 'var(--slate-100)', borderRadius: 4, height: 8 }}>
                      <div
                        style={{
                          width: `${(item.count / total) * 100}%`,
                          background: item.color,
                          height: '100%',
                          borderRadius: 4,
                          transition: 'width .4s',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Due / Overdue Patients</span>
            <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>Patients needing vaccination follow-up</span>
          </div>
          <div className="table-wrap">
            {!data.due_overdue_patients || data.due_overdue_patients.length === 0 ? (
              <div className="empty-state" style={{ padding: 36 }}>
                <div className="empty-icon">Today</div>
                <div className="empty-text">No due or overdue patients</div>
                <div className="empty-sub">Upcoming vaccination follow-ups will appear here</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 110 }}>Status</th>
                    <th style={{ width: 130 }}>Patient ID</th>
                    <th>Patient Name</th>
                    <th style={{ width: 100 }}>Dose</th>
                    <th style={{ width: 130 }}>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.due_overdue_patients.map((patient, i) => (
                    <tr key={`${patient.patient_id}-${patient.dose_day}-${i}`}>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 74,
                            padding: '5px 10px',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            color: patient.status === 'overdue' ? 'var(--red-600)' : 'var(--amber-600)',
                            background: patient.status === 'overdue' ? 'rgba(220, 38, 38, 0.08)' : 'rgba(217, 119, 6, 0.08)',
                          }}
                        >
                          {patient.status === 'overdue' ? 'Overdue' : 'Due'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--blue-600)', fontWeight: 600 }}>
                        {patient.patient_id || '-'}
                      </td>
                      <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-700)' }}>{patient.full_name || '-'}</td>
                      <td style={{ fontSize: 12, color: 'var(--slate-600)' }}>{patient.dose_day || '-'}</td>
                      <td style={{ fontSize: 12, color: 'var(--slate-500)' }}>
                        {formatSheetDate(patient.due_date)}
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
