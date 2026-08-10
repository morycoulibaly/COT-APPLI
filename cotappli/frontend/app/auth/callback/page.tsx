'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Wordmark } from '@/components/Wordmark';

export default function AuthCallbackPage() {
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

    // Le code n'est valable que 60 secondes et une seule fois : on l'échange
    // immédiatement contre le vrai token (reçu dans le corps de la réponse, pas l'URL).
    exchangeGoogleCode(code).catch(() => {
      setError('Ce lien de connexion a expiré ou a déjà été utilisé. Réessayez.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
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
    </div>
  );
}