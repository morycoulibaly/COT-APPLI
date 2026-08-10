'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Wordmark } from '@/components/Wordmark';

// 1. On isole la logique interne qui utilise useSearchParams()
function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { exchangeGoogleCode } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(errorParam);
      return;
    }

    if (!code) {
      setError('Connexion impossible : aucun code reçu.');
      return;
    }

    exchangeGoogleCode(code).catch(() => {
      setError('Ce lien de connexion a expiré ou a déjà été utilisé. Réessayez.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="w-full max-w-sm text-center">
      <div className="mb-8 flex justify-center">
        <Wordmark />
      </div>
      {error ? (
        <div className="card p-6">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button onClick={() => router.push('/login')} className="btn-primary w-full">
            Retour à la connexion
          </button>
        </div>
      ) : (
        <p className="text-ink/50">Connexion en cours…</p>
      )}
    </div>
  );
}

// 2. Le composant principal exporté par défaut enveloppe le tout dans Suspense
export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Suspense fallback={
        <div className="w-full max-w-sm text-center">
          <div className="mb-8 flex justify-center">
            <Wordmark />
          </div>
          <p className="text-ink/50">Chargement de la page de connexion…</p>
        </div>
      }>
        <AuthCallbackContent />
      </Suspense>
    </div>
  );
}
