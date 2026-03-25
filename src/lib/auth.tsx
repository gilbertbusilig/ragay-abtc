'use client';
// lib/auth.tsx — Auth context

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { api } from './api';

interface AuthCtx {
  user: User | null;
  activeNurse: User | null;
  token: string | null;
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

  useEffect(() => {
    const saved = localStorage.getItem('abtc_session');
    if (saved) {
      try {
        const { user: u, token: t } = JSON.parse(saved);
        setUser(u);
        setToken(t);
        if (u.role === 'nurse') loadNurses();
      } catch {}
    }
  }, []);

  async function login(username: string, password: string) {
    const res = await api.login(username, password);
    if (res.status === 'ok') {
      setUser(res.data.user);
      setToken(res.data.token);
      localStorage.setItem('abtc_session', JSON.stringify({ user: res.data.user, token: res.data.token }));
      if (res.data.user.role === 'nurse') {
        await loadNurses();
      }
      return { ok: true };
    }
    return { ok: false, error: res.message || 'Login failed' };
  }

  function logout() {
    setUser(null);
    setToken(null);
    setActiveNurse(null);
    localStorage.removeItem('abtc_session');
  }

  async function loadNurses() {
    const res = await api.getNurses();
    if (res.status === 'ok') setNurses(res.data);
  }

  return (
    <AuthContext.Provider value={{ user, activeNurse, token, login, logout, setActiveNurse, nurses, loadNurses }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
