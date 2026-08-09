'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError, GroupSummary } from '@/lib/api';
import { AppHeader } from '@/components/AppHeader';
import { ProgressBar, formatAmount } from '@/components/ProgressBar';

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    api
      .get<GroupSummary[]>('/groups')
      .then(setGroups)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur de chargement'));
  }, [user]);

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl text-ink">Mes groupes</h1>
            <p className="text-sm text-ink/60 mt-1">Vos caisses communes et collectes en cours</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Nouveau groupe
          </button>
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {groups === null && <p className="text-ink/50">Chargement…</p>}

        {groups?.length === 0 && (
          <div className="card p-10 text-center">
            <p className="font-display font-semibold text-ink mb-1">Aucun groupe pour l&apos;instant</p>
            <p className="text-sm text-ink/60 mb-4">
              Créez votre première caisse commune pour commencer à suivre les cotisations.
            </p>
            <button onClick={() => setShowForm(true)} className="btn-primary">
              Créer mon premier groupe
            </button>
          </div>
        )}

        {groups && groups.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="card p-5 hover:border-teal-400 transition-colors"
              >
                <h2 className="font-display font-semibold text-ink mb-1">{group.title}</h2>
                {group.description && (
                  <p className="text-sm text-ink/60 mb-4 line-clamp-2">{group.description}</p>
                )}
                <ProgressBar percent={group.progressPercent} />
                <div className="flex items-center justify-between mt-2 text-sm">
                  <span className="text-ink/70">
                    {formatAmount(group.totalCollected, group.currency)} /{' '}
                    {formatAmount(group.targetAmount, group.currency)}
                  </span>
                  <span className="font-semibold text-teal-600">{group.progressPercent}%</span>
                </div>
                <p className="text-xs text-ink/50 mt-3">{group.members.length} membre(s)</p>
              </Link>
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <CreateGroupModal
          onClose={() => setShowForm(false)}
          onCreated={(g) => {
            setGroups((prev) => (prev ? [g, ...prev] : [g]));
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function CreateGroupModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (group: GroupSummary) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const created = await api.post<GroupSummary>('/groups', {
        title,
        description: description || undefined,
        targetAmount: Number(targetAmount),
        paymentInstructions: paymentInstructions || undefined,
      });
      onCreated({ ...created, members: [], totalCollected: 0, progressPercent: 0 });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Création impossible');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-4 z-50">
      <div className="card w-full max-w-md p-6">
        <h2 className="font-display font-bold text-lg text-ink mb-4">Nouveau groupe</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="title">Nom du groupe</label>
            <input
              id="title"
              required
              className="input-field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tontine du quartier"
            />
          </div>
          <div>
            <label className="label" htmlFor="description">Description (optionnel)</label>
            <textarea
              id="description"
              className="input-field"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="targetAmount">Montant cible (XOF)</label>
            <input
              id="targetAmount"
              type="number"
              min={1}
              required
              className="input-field"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="500000"
            />
          </div>
          <div>
            <label className="label" htmlFor="paymentInstructions">
              Instructions de paiement (optionnel)
            </label>
            <textarea
              id="paymentInstructions"
              className="input-field"
              rows={2}
              value={paymentInstructions}
              onChange={(e) => setPaymentInstructions(e.target.value)}
              placeholder="Ex : Envoyez vos cotisations par Mobile Money au 07 XX XX XX XX"
            />
            <p className="text-xs text-ink/50 mt-1">
              Affiché sur la page publique partagée avec les participants non-inscrits.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
