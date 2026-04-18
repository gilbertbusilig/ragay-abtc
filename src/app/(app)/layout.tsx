'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const NAV = [
  { section: 'Main', items: [
    { href: '/dashboard', label: 'Dashboard',       icon: '📊' },
    { href: '/patients',  label: 'Patient Records', icon: '🗂️' },
  ]},
  { section: 'Reports', items: [
    { href: '/vaccines', label: 'Vaccine Schedule', icon: '💉' },
    { href: '/forms',    label: 'Forms',            icon: '📋' },
  ]},
  { section: 'Admin', items: [
    { href: '/accounts', label: 'Accounts', icon: '👥', adminOnly: true },
  ]},
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, activeNurse, nurses, setActiveNurse, logout, initialized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (initialized && !user) router.replace('/');
  }, [initialized, user, router]);
  if (!initialized || !user) return null;

  const displayUser = user.role === 'nurse' && activeNurse ? activeNurse : user;
  const initials = displayUser.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <div className="app-shell">
      <aside className="sidebar no-print">

        {/* Three logos row */}
        <div style={{ padding:'14px 12px 10px', background:'#172554', borderBottom:'1px solid rgba(255,255,255,.08)', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
          <div style={{ display:'flex', gap:10, alignItems:'center', justifyContent:'center' }}>
            {[
              { src:'/logos/bagong_pilipinas.jpg', alt:'Bagong Pilipinas' },
              { src:'/logos/lgu_logo.jpg',         alt:'Municipality of Ragay' },
              { src:'/logos/rhu_logo.png',          alt:'Rural Health Unit' },
            ].map(logo => (
              <div key={logo.alt} style={{ width:40, height:40, background:'white', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', padding:3, flexShrink:0, border:'1px solid rgba(15,23,42,.08)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo.src} alt={logo.alt} style={{ width:'100%', height:'100%', objectFit:'contain', borderRadius:5 }} />
              </div>
            ))}
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'white', lineHeight:1.3 }}>Ragay ABTC</div>
            <div style={{ fontSize:10, color:'#93c5fd', lineHeight:1.3, marginTop:2 }}>Animal Bite Treatment Center</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV.map(section => (
            <div key={section.section}>
              <div className="nav-section-label">{section.section}</div>
              {section.items.map(item => {
                if ((item as any).adminOnly && user.role !== 'admin') return null;
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <button key={item.href}
                    className={active ? 'nav-item active' : 'nav-item'}
                    onClick={() => router.push(item.href)}>
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {user.role === 'nurse' && nurses.length > 0 && (
            <div className="nurse-selector">
              <label>Active Nurse</label>
              <select value={activeNurse?.user_id || ''} onChange={e => {
                const n = nurses.find(x => x.user_id === e.target.value);
                if (n) setActiveNurse(n);
              }}>
                {nurses.map(n => (
                  <option key={n.user_id} value={n.user_id}>
                    {n.full_name}{n.credential ? `, ${n.credential}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="user-badge">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="name">{displayUser.full_name}{displayUser.credential ? `, ${displayUser.credential}` : ''}</div>
              <div className="role" style={{ textTransform:'capitalize' }}>{user.role}</div>
            </div>
            <button className="logout-btn" onClick={logout} title="Sign out">⏻</button>
          </div>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
