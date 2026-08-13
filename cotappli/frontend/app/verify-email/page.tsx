'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { Wordmark } from '@/components/Wordmark';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const { verifyEmail, resendCode } = useAuth();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await verifyEmail(email, code);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Code invalide');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setResendState('sending');
    try {
      await resendCode(email);
      setResendState('sent');
      setTimeout(() => setResendState('idle'), 15000);
    } catch {
      setResendState('idle');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Wordmark />
        </div>
        <div className="card p-6">
          <h1 className="font-display font-bold text-xl text-ink mb-1">Vérifiez votre email</h1>
          <p className="text-sm text-ink/60 mb-6">
            Un code à 6 chiffres a été envoyé à <span className="font-medium text-ink">{email}</span>.
            Il expire dans 15 minutes.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="code">Code de vérification</label>
              <input
                id="code"
                required
                inputMode="numeric"
                maxLength={6}
                className="input-field text-center text-2xl tracking-[0.4em] font-semibold"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || code.length !== 6}
              className="btn-primary w-full"
            >
              {isSubmitting ? 'Vérification…' : 'Vérifier'}
            </button>
          </form>

          <button
            onClick={handleResend}
            disabled={resendState !== 'idle'}
            className="text-sm text-teal-600 font-medium hover:underline mt-4 disabled:opacity-50 disabled:no-underline"
          >
            {resendState === 'sending' && 'Envoi…'}
            {resendState === 'sent' && 'Code renvoyé !'}
            {resendState === 'idle' && "Je n'ai rien reçu, renvoyer le code"}
          </button>
        </div>
      </div>
    </div>
  );
}