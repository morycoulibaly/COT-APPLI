"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, AuthResponse } from './api';

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
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  exchangeGoogleCode: (code: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('cotappli_user');
    if (stored) setUser(JSON.parse(stored));
    setIsLoading(false);
  }, []);

  function persistSession(res: AuthResponse) {
    localStorage.setItem('cotappli_token', res.accessToken);
    localStorage.setItem('cotappli_user', JSON.stringify(res.user));
    setUser(res.user);
  }

  async function login(email: string, password: string) {
    try {
      const res = await api.post<AuthResponse>('/auth/login', { email, password });
      persistSession(res);
      router.push('/dashboard');
    } catch (err) {
      // Email pas encore vérifié : on redirige directement vers l'écran de code
      // plutôt que d'afficher une simple erreur sur la page de connexion.
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      throw err;
    }
  }

  // L'inscription ne connecte plus directement : elle crée le compte (non-vérifié)
  // et envoie un code par email. La connexion réelle se fait après verifyEmail().
  async function register(email: string, password: string, fullName: string) {
    await api.post<{ email: string }>('/auth/register', { email, password, fullName });
    router.push(`/verify-email?email=${encodeURIComponent(email)}`);
  }

  async function verifyEmail(email: string, code: string) {
    const res = await api.post<AuthResponse>('/auth/verify-email', { email, code });
    persistSession(res);
    router.push('/dashboard');
  }

  async function resendCode(email: string) {
    await api.post('/auth/resend-code', { email });
  }

  // Utilisé par la page /auth/callback après une connexion Google réussie.
  async function exchangeGoogleCode(code: string) {
    const res = await api.post<AuthResponse>('/auth/google/exchange', { code });
    persistSession(res);
    router.push('/dashboard');
  }

  function logout() {
    localStorage.removeItem('cotappli_token');
    localStorage.removeItem('cotappli_user');
    setUser(null);
    router.push('/login');
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, verifyEmail, resendCode, exchangeGoogleCode, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}