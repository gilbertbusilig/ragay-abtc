'use client';
// lib/auth.tsx — Auth context

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { api } from './api';

interface AuthCtx {
  user: User | null;
  activeNurse: User | null;
  token: string | null;
  initialized: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  setActiveNurse: (nurse: User) => void;
  nurses: User[];
  loadNurses: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeNurse, setActiveNurse] = useState<User | null>(null);
  const [nurses, setNurses] = useState<User[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('abtc_session');
      if (saved) {
        const { user: u, token: t, activeNurse: savedActiveNurse } = JSON.parse(saved);
        setUser(u);
        setToken(t);
        if (savedActiveNurse) setActiveNurse(savedActiveNurse);
        if (u?.role === 'nurse') loadNurses();
      }
    } catch {}
    setInitialized(true);
  }, []);

  function persistSession(nextUser: User | null, nextToken: string | null, nextActiveNurse: User | null) {
    try {
      if (!nextUser || !nextToken) {
        localStorage.removeItem('abtc_session');
        return;
      }
      localStorage.setItem('abtc_session', JSON.stringify({
        user: nextUser,
        token: nextToken,
        activeNurse: nextActiveNurse,
      }));
    } catch {}
  }

  async function login(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await api.login(username, password);
      if (res.status === 'ok' && res.data?.user) {
        const u = res.data.user;
        const t = res.data.token;
        setUser(u);
        setToken(t);
        persistSession(u, t, null);
        if (u.role === 'nurse') {
          await loadNurses();
        }
        return { ok: true };
      }
      return { ok: false, error: res.message || 'Invalid username or password' };
    } catch (err: any) {
      return { ok: false, error: 'Connection error. Check your internet and try again.' };
    }
  }

  function logout() {
    setUser(null);
    setToken(null);
    setActiveNurse(null);
    persistSession(null, null, null);
  }

  function handleSetActiveNurse(nurse: User) {
    setActiveNurse(nurse);
    persistSession(user, token, nurse);
  }

  async function loadNurses() {
    try {
      // Check session cache first
      const cached = sessionStorage.getItem('abtc_nurses');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) { setNurses(parsed); return; }
      }
      const res = await api.getNurses();
      if (res.status === 'ok' && Array.isArray(res.data)) {
        setNurses(res.data);
        sessionStorage.setItem('abtc_nurses', JSON.stringify(res.data));
      }
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, activeNurse, token, initialized, login, logout, setActiveNurse: handleSetActiveNurse, nurses, loadNurses }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
