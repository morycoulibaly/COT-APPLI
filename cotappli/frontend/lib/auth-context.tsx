'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, AuthResponse } from './api';

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('coopappli_user');
    if (stored) setUser(JSON.parse(stored));
    setIsLoading(false);
  }, []);

  function persistSession(res: AuthResponse) {
    localStorage.setItem('coopappli_token', res.accessToken);
    localStorage.setItem('coopappli_user', JSON.stringify(res.user));
    setUser(res.user);
  }

  async function login(email: string, password: string) {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    persistSession(res);
    router.push('/dashboard');
  }

  async function register(email: string, password: string, fullName: string) {
    const res = await api.post<AuthResponse>('/auth/register', { email, password, fullName });
    persistSession(res);
    router.push('/dashboard');
  }

  function logout() {
    localStorage.removeItem('coopappli_token');
    localStorage.removeItem('coopappli_user');
    setUser(null);
    router.push('/login');
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}
