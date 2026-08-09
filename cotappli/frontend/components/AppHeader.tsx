'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Wordmark } from './Wordmark';

export function AppHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-line bg-white">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/dashboard">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-ink/60 hidden sm:inline">{user?.fullName}</span>
          <button onClick={logout} className="text-sm font-medium text-teal-600 hover:underline">
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
}
