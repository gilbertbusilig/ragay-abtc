'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { DashboardData } from '@/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type AgeFilter = 'all' | 'under15' | '15' | 'over15';
type SexFilter = 'all' | 'male' | 'female';
type AnimalFilter = 'all' | 'dog' | 'cat' | 'bat' | 'other';
type CategoryFilter = 'all' | 'I' | 'II' | 'III';
type RigFilter = 'all' | 'ERIG' | 'HRIG';

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

function SummaryList({ title, items }: { title: string; items: Array<{ label: string; value: number; color: string }> }) {
  return (
    <div
      style={{
        border: '1px solid rgba(148, 163, 184, 0.18)',
        borderRadius: 16,
        padding: 14,
        background: 'linear-gradient(180deg, rgba(248, 250, 252, 0.95), rgba(255, 255, 255, 1))',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--slate-500)', marginBottom: 10, letterSpacing: '.04em', textTransform: 'uppercase' }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(item => (
          <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 10, height: 10, borderRadius: 999, background: item.color }} />
              <span style={{ color: 'var(--slate-600)' }}>{item.label}</span>
            </div>
            <strong style={{ color: 'var(--slate-800)' }}>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [monthFilter, setMonthFilter] = useState<number>(0); // 0 = all
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('all');
  const [sexFilter, setSexFilter] = useState<SexFilter>('all');
  const [animalFilter, setAnimalFilter] = useState<AnimalFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [rigFilter, setRigFilter] = useState<RigFilter>('all');

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

  const filteredRecords = (data.demographics_records || []).filter(record => {
    if (monthFilter !== 0 && (record as any).consult_month !== monthFilter) return false;
    if (ageFilter !== 'all' && record.age_group !== ageFilter) return false;
    if (sexFilter !== 'all' && record.sex !== sexFilter) return false;
    if (animalFilter !== 'all' && record.animal_type !== animalFilter) return false;
    if (categoryFilter !== 'all' && record.category !== categoryFilter) return false;
    if (rigFilter !== 'all' && record.erig_hrig !== rigFilter) return false;
    return true;
  });

  const filteredAgeCounts = {
    under15: filteredRecords.filter(record => record.age_group === 'under15').length,
    '15': filteredRecords.filter(record => record.age_group === '15').length,
    over15: filteredRecords.filter(record => record.age_group === 'over15').length,
  };

  const filteredSexCounts = {
    male: filteredRecords.filter(record => record.sex === 'male').length,
    female: filteredRecords.filter(record => record.sex === 'female').length,
  };

  const filteredAnimalCounts = {
    dog: filteredRecords.filter(record => record.animal_type === 'dog').length,
    cat: filteredRecords.filter(record => record.animal_type === 'cat').length,
    bat: filteredRecords.filter(record => record.animal_type === 'bat').length,
    other: filteredRecords.filter(record => record.animal_type === 'other').length,
  };

  const filteredCategoryCounts = {
    I: filteredRecords.filter(record => record.category === 'I').length,
    II: filteredRecords.filter(record => record.category === 'II').length,
    III: filteredRecords.filter(record => record.category === 'III').length,
  };

  const filteredRigCounts = {
    ERIG: filteredRecords.filter(record => record.erig_hrig === 'ERIG').length,
    HRIG: filteredRecords.filter(record => record.erig_hrig === 'HRIG').length,
  };

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
          <div className="alert alert-red" style={{ marginBottom: 8, borderRadius: 16, boxShadow: '0 10px 30px rgba(239, 68, 68, 0.08)' }}>
            <strong>{data.overdue_doses} overdue dose{data.overdue_doses > 1 ? 's' : ''}</strong> patients need immediate follow-up
          </div>
        )}
        {data.due_today > 0 && (
          <div className="alert alert-amber" style={{ marginBottom: 18, borderRadius: 16, boxShadow: '0 10px 30px rgba(245, 158, 11, 0.08)' }}>
            <strong>{data.due_today} dose{data.due_today > 1 ? 's' : ''} due today</strong> · {data.due_this_week} due this week
          </div>
        )}

        <div className="stat-grid" style={{ marginBottom: 18 }}>
          {[
            { val: data.total_patients, label: 'Total Patients', cls: '' },
            { val: data.active_treatment, label: 'Active Treatment', cls: 'amber' },
            { val: data.completed, label: 'Completed', cls: 'green' },
            { val: data.overdue_doses, label: 'Overdue Doses', cls: 'red' },
            { val: data.due_today, label: 'Due Today', cls: '' },
            { val: data.pet_monitors_active, label: 'Pet Monitors', cls: '' },
          ].map(s => (
            <div
              key={s.label}
              className={`stat-card ${s.cls}`}
              style={{
                borderRadius: 18,
                border: '1px solid rgba(148, 163, 184, 0.12)',
                boxShadow: '0 18px 35px rgba(15, 23, 42, 0.06)',
                background: 'linear-gradient(180deg, rgba(255,255,255,1), rgba(248,250,252,0.92))',
              }}
            >
              <div className="stat-value">{s.val}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
          <div className="card">
            <div
              className="card-header"
              style={{
                paddingBottom: 10,
                borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
                marginBottom: 10,
              }}
            >
              <div>
                <span className="card-title">Monthly Cases - {year}</span>
                <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 4 }}>Case trend overview for the selected year</div>
              </div>
            </div>
            <div className="card-body" style={{ paddingTop: 0 }}>
              <BarChart data={data.monthly} labels={MONTHS} />
            </div>
          </div>

          <div className="card">
            <div
              className="card-header"
              style={{
                paddingBottom: 10,
                borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
                marginBottom: 12,
                alignItems: 'flex-start',
              }}
            >
              <div>
                <span className="card-title">Patient Demographics</span>
                <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 4 }}>
                  Track patient breakdowns and narrow the count using combined filters
                </div>
              </div>
            </div>
            <div className="card-body" style={{ paddingTop: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <SummaryList
                  title="Age Groups"
                  items={[
                    { label: 'Under 15', value: filteredAgeCounts.under15, color: '#a78bfa' },
                    { label: '15 yrs', value: filteredAgeCounts['15'], color: '#2563eb' },
                    { label: 'Over 15', value: filteredAgeCounts.over15, color: '#1d4ed8' },
                  ]}
                />
                <SummaryList
                  title="Sex"
                  items={[
                    { label: 'Male', value: filteredSexCounts.male, color: '#2563eb' },
                    { label: 'Female', value: filteredSexCounts.female, color: '#ec4899' },
                  ]}
                />
                <SummaryList
                  title="Animal Type"
                  items={[
                    { label: 'Dog', value: filteredAnimalCounts.dog, color: '#2563eb' },
                    { label: 'Cat', value: filteredAnimalCounts.cat, color: '#7c3aed' },
                    { label: 'Bat', value: filteredAnimalCounts.bat, color: '#db2777' },
                    { label: 'Other', value: filteredAnimalCounts.other, color: '#d97706' },
                  ]}
                />
                <SummaryList
                  title="Exposure Category"
                  items={[
                    { label: 'Category I', value: filteredCategoryCounts.I, color: '#22c55e' },
                    { label: 'Category II', value: filteredCategoryCounts.II, color: '#f59e0b' },
                    { label: 'Category III', value: filteredCategoryCounts.III, color: '#ef4444' },
                  ]}
                />
                <div style={{ gridColumn: '1 / -1' }}>
                  <SummaryList
                    title="ERIG / HRIG"
                    items={[
                      { label: 'ERIG', value: filteredRigCounts.ERIG, color: '#2563eb' },
                      { label: 'HRIG', value: filteredRigCounts.HRIG, color: '#7c3aed' },
                    ]}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 10,
                  marginTop: 18,
                  padding: 14,
                  borderRadius: 16,
                  background: 'linear-gradient(180deg, rgba(241, 245, 249, 0.9), rgba(248, 250, 252, 0.7))',
                  border: '1px solid rgba(148, 163, 184, 0.14)',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--slate-500)', marginBottom: 6 }}>
                    Month
                  </label>
                  <select className="form-select" value={monthFilter} onChange={e => setMonthFilter(Number(e.target.value))}>
                    <option value={0}>All Months</option>
                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--slate-500)', marginBottom: 6 }}>
                    Age Group
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
                    Sex
                  </label>
                  <select className="form-select" value={sexFilter} onChange={e => setSexFilter(e.target.value as SexFilter)}>
                    <option value="all">All Sex</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--slate-500)', marginBottom: 6 }}>
                    Animal Type
                  </label>
                  <select className="form-select" value={animalFilter} onChange={e => setAnimalFilter(e.target.value as AnimalFilter)}>
                    <option value="all">All Animals</option>
                    <option value="dog">Dog</option>
                    <option value="cat">Cat</option>
                    <option value="bat">Bat</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--slate-500)', marginBottom: 6 }}>
                    Category
                  </label>
                  <select className="form-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as CategoryFilter)}>
                    <option value="all">All Categories</option>
                    <option value="I">Category I</option>
                    <option value="II">Category II</option>
                    <option value="III">Category III</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--slate-500)', marginBottom: 6 }}>
                    ERIG / HRIG
                  </label>
                  <select className="form-select" value={rigFilter} onChange={e => setRigFilter(e.target.value as RigFilter)}>
                    <option value="all">All RIG</option>
                    <option value="ERIG">ERIG</option>
                    <option value="HRIG">HRIG</option>
                  </select>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            borderRadius: 20,
            border: '1px solid rgba(148, 163, 184, 0.12)',
            boxShadow: '0 22px 40px rgba(15, 23, 42, 0.06)',
            overflow: 'hidden',
          }}
        >
          <div
            className="card-header"
            style={{
              paddingBottom: 10,
              borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
              marginBottom: 0,
              background: 'linear-gradient(180deg, rgba(248,250,252,0.95), rgba(255,255,255,1))',
            }}
          >
            <div>
              <span className="card-title">Due / Overdue Patients</span>
              <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 4 }}>Patients needing vaccination follow-up</div>
            </div>
          </div>
          <div className="table-wrap">
            {!data.due_overdue_patients || data.due_overdue_patients.length === 0 ? (
              <div className="empty-state" style={{ padding: 36 }}>
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
                      <td style={{ fontSize: 12, color: 'var(--slate-500)' }}>{formatSheetDate(patient.due_date)}</td>
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
