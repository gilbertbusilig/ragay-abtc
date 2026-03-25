'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const NAV = [
  { section: 'Main', items: [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/patients', label: 'Patient Records', icon: '🗂️' },
  ]},
  { section: 'Reports', items: [
    { href: '/vaccines', label: 'Vaccine Schedule', icon: '💉' },
  ]},
  { section: 'Admin', items: [
    { href: '/accounts', label: 'Accounts', icon: '👥', adminOnly: true },
  ]},
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, activeNurse, nurses, setActiveNurse, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!user) router.replace('/');
  }, [user]);

  if (!user) return null;

  const displayUser = user.role === 'nurse' && activeNurse ? activeNurse : user;
  const initials = displayUser.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar no-print">
        <div className="sidebar-logo">
          <div className="cross-icon">✚</div>
          <div className="org-name">Ragay Animal Bite<br />Treatment Center</div>
          <div className="abtc">ABTC · MHO · CamSur</div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(section => (
            <div key={section.section}>
              <div className="nav-section-label">{section.section}</div>
              {section.items.map(item => {
                if ((item as any).adminOnly && user.role !== 'admin') return null;
                return (
                  <button
                    key={item.href}
                    className={`nav-item ${pathname === item.href ? 'active' : ''}`}
                    onClick={() => router.push(item.href)}
                  >
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          {/* Nurse selector */}
          {user.role === 'nurse' && nurses.length > 0 && (
            <div className="nurse-selector">
              <label>Active Nurse</label>
              <select value={activeNurse?.user_id || ''} onChange={e => {
                const n = nurses.find(x => x.user_id === e.target.value);
                if (n) setActiveNurse(n);
              }}>
                {nurses.map(n => (
                  <option key={n.user_id} value={n.user_id}>
                    {n.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="user-badge">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="name">{displayUser.full_name}</div>
              <div className="role">{user.role}{displayUser.credential ? ` · ${displayUser.credential}` : ''}</div>
            </div>
            <button className="logout-btn" onClick={logout} title="Sign out">⏻</button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">{children}</main>
    </div>
  );
}
