'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError, GroupSummary, Contribution } from '@/lib/api';
import { AppHeader } from '@/components/AppHeader';
import { ProgressBar, formatAmount } from '@/components/ProgressBar';

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [group, setGroup] = useState<GroupSummary | null>(null);
  const [history, setHistory] = useState<Contribution[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{ id: string; name: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [g, h] = await Promise.all([
        api.get<GroupSummary>(`/groups/${id}`),
        api.get<Contribution[]>(`/groups/${id}/contributions`),
      ]);
      setGroup(g);
      setHistory(h);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur de chargement');
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        {!group ? (
          <p className="text-ink/50">Chargement…</p>
        ) : (
          <>
            <div className="card p-6 mb-6">
              <h1 className="font-display font-bold text-2xl text-ink">{group.title}</h1>
              {group.description && <p className="text-sm text-ink/60 mt-1">{group.description}</p>}
              <div className="mt-4">
                <ProgressBar percent={group.progressPercent} />
                <div className="flex items-center justify-between mt-2 text-sm">
                  <span className="text-ink/70">
                    {formatAmount(group.totalCollected, group.currency)} collectés sur{' '}
                    {formatAmount(group.targetAmount, group.currency)}
                  </span>
                  <span className="font-semibold text-teal-600">{group.progressPercent}%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-lg text-ink">
                Membres ({group.members.length})
              </h2>
              <button onClick={() => setShowMemberForm(true)} className="btn-secondary text-sm">
                + Ajouter un membre
              </button>
            </div>

            <div className="card divide-y divide-line mb-8">
              {group.members.length === 0 && (
                <p className="p-5 text-sm text-ink/50">Aucun membre enregistré pour l&apos;instant.</p>
              )}
              {group.members.map((member) => (
                <div key={member.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink truncate">{member.displayName}</p>
                    {member.phone && <p className="text-xs text-ink/50">{member.phone}</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm text-ink/70 hidden sm:inline">
                      {formatAmount(member.totalPaid, group.currency)}
                    </span>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        member.status === 'a_jour'
                          ? 'bg-teal-50 text-teal-600'
                          : 'bg-gold-100 text-gold-600'
                      }`}
                    >
                      {member.status === 'a_jour' ? 'À jour' : 'En retard'}
                    </span>
                    <button
                      onClick={() => setPaymentTarget({ id: member.id, name: member.displayName })}
                      className="text-sm font-medium text-teal-600 hover:underline"
                    >
                      + Versement
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <h2 className="font-display font-semibold text-lg text-ink mb-3">
              Journal des versements
            </h2>
            <div className="card divide-y divide-line">
              {history?.length === 0 && (
                <p className="p-5 text-sm text-ink/50">Aucun versement enregistré pour l&apos;instant.</p>
              )}
              {history?.map((c) => (
                <div key={c.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-ink text-sm">{c.member.displayName}</p>
                    <p className="text-xs text-ink/50">
                      {new Date(c.paymentDate).toLocaleDateString('fr-FR')}
                      {c.paymentMethod ? ` · ${c.paymentMethod}` : ''}
                    </p>
                  </div>
                  <span className="font-semibold text-teal-600 text-sm">
                    {formatAmount(c.amount, group.currency)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {showMemberForm && group && (
        <AddMemberModal
          groupId={group.id}
          onClose={() => setShowMemberForm(false)}
          onAdded={() => {
            setShowMemberForm(false);
            loadData();
          }}
        />
      )}

      {paymentTarget && group && (
        <AddPaymentModal
          groupId={group.id}
          member={paymentTarget}
          onClose={() => setPaymentTarget(null)}
          onAdded={() => {
            setPaymentTarget(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function AddMemberModal({
  groupId,
  onClose,
  onAdded,
}: {
  groupId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post(`/groups/${groupId}/members`, { displayName, phone: phone || undefined });
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ajout impossible');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-4 z-50">
      <div className="card w-full max-w-md p-6">
        <h2 className="font-display font-bold text-lg text-ink mb-4">Ajouter un membre</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="displayName">Nom</label>
            <input
              id="displayName"
              required
              className="input-field"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Fatou Diarra"
            />
          </div>
          <div>
            <label className="label" htmlFor="phone">Téléphone (optionnel)</label>
            <input
              id="phone"
              className="input-field"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+225 07 00 00 00 00"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Ajout…' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddPaymentModal({
  groupId,
  member,
  onClose,
  onAdded,
}: {
  groupId: string;
  member: { id: string; name: string };
  onClose: () => void;
  onAdded: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('Espèces');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post(`/groups/${groupId}/contributions`, {
        memberId: member.id,
        amount: Number(amount),
        paymentDate: new Date(paymentDate).toISOString(),
        paymentMethod,
      });
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Enregistrement impossible');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-4 z-50">
      <div className="card w-full max-w-md p-6">
        <h2 className="font-display font-bold text-lg text-ink mb-1">Enregistrer un versement</h2>
        <p className="text-sm text-ink/60 mb-4">{member.name}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="amount">Montant</label>
            <input
              id="amount"
              type="number"
              min={1}
              required
              className="input-field"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="25000"
            />
          </div>
          <div>
            <label className="label" htmlFor="paymentDate">Date</label>
            <input
              id="paymentDate"
              type="date"
              required
              className="input-field"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="paymentMethod">Mode de règlement</label>
            <select
              id="paymentMethod"
              className="input-field"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option>Espèces</option>
              <option>Virement</option>
              <option>Mobile Money</option>
              <option>Chèque</option>
              <option>Autre</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
