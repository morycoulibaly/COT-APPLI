'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError, GroupSummary, Contribution, ReceiptScanResult, ReminderTone } from '@/lib/api';
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
  const [showShare, setShowShare] = useState(false);
  const [reminderTarget, setReminderTarget] = useState<{ id: string; name: string } | null>(null);
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);
  const [showScanContribution, setShowScanContribution] = useState(false);

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
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink/70 hover:text-ink transition-colors"
        >
          Retour
        </button>
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        {!group ? (
          <p className="text-ink/50">Chargement…</p>
        ) : (
          <>
            <div className="card p-6 mb-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="font-display font-bold text-2xl text-ink">{group.title}</h1>
                  {group.description && <p className="text-sm text-ink/60 mt-1">{group.description}</p>}
                </div>
                <button onClick={() => setShowShare(true)} className="btn-secondary text-sm shrink-0">
                  Partager
                </button>
              </div>
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
                      {member.expectedAmount != null &&
                        ` / ${formatAmount(member.expectedAmount, group.currency)}`}
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
                    {member.status === 'en_retard' && (
                      <button
                        onClick={() => setReminderTarget({ id: member.id, name: member.displayName })}
                        className="text-sm font-medium text-gold-600 hover:underline whitespace-nowrap"
                      >
                        Relancer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-lg text-ink">
                Journal des versements
              </h2>
              <button
                onClick={() => setShowScanContribution(true)}
                className="btn-secondary text-sm"
              >
                📸 Nouveau versement par reçu
              </button>
            </div>
            <div className="card divide-y divide-line">
              {history?.length === 0 && (
                <p className="p-5 text-sm text-ink/50">Aucun versement enregistré pour l&apos;instant.</p>
              )}
              {history?.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedContribution(c)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-sand/60 transition-colors"
                >
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
                </button>
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

      {showShare && group && <ShareModal group={group} onClose={() => setShowShare(false)} />}

      {reminderTarget && group && (
        <ReminderModal
          groupId={group.id}
          member={reminderTarget}
          onClose={() => setReminderTarget(null)}
        />
      )}

      {selectedContribution && group && (
        <ContributionDetailModal
          contribution={selectedContribution}
          currency={group.currency}
          onClose={() => setSelectedContribution(null)}
        />
      )}

      {showScanContribution && group && (
        <ScanContributionModal
          group={group}
          onClose={() => setShowScanContribution(false)}
          onAdded={() => {
            setShowScanContribution(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function ContributionDetailModal({
  contribution,
  currency,
  onClose,
}: {
  contribution: Contribution;
  currency: string;
  onClose: () => void;
}) {
  const rows: { label: string; value: string }[] = [
    { label: 'Membre', value: contribution.member.displayName },
    { label: 'Montant', value: formatAmount(contribution.amount, currency) },
    { label: 'Date', value: new Date(contribution.paymentDate).toLocaleDateString('fr-FR') },
    { label: 'Mode de règlement', value: contribution.paymentMethod ?? '—' },
    { label: 'Expéditeur (scan)', value: contribution.senderName ?? '—' },
    { label: 'Référence transaction', value: contribution.transactionReference ?? '—' },
    { label: 'Notes', value: contribution.notes ?? '—' },
  ];

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-4 z-50">
      <div className="card w-full max-w-sm p-6">
        <h2 className="font-display font-bold text-lg text-ink mb-4">Détails du versement</h2>
        <div className="divide-y divide-line">
          {rows.map((row) => (
            <div key={row.label} className="py-2.5 flex items-center justify-between gap-3">
              <span className="text-xs text-ink/50 shrink-0">{row.label}</span>
              <span className="text-sm text-ink font-medium text-right break-words">{row.value}</span>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="btn-secondary w-full mt-5">
          Fermer
        </button>
      </div>
    </div>
  );
}

function ShareModal({ group, onClose }: { group: GroupSummary; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const publicUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/c/${group.shareToken}` : '';

  const shareMessage = `Salut à tous ! J'ai créé l'espace de suivi pour la cotisation "${group.title}" sur COT'APPLI. Vous pouvez suivre l'avancement des versements et l'objectif en temps réel ici : ${publicUrl}`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(
    `Suivez la cotisation "${group.title}" en temps réel sur COT'APPLI :`,
  )}`;
  // Facebook n'accepte qu'une URL (u=) : le texte pré-rempli n'est plus supporté depuis
  // plusieurs années par leur boîte de dialogue de partage, quel que soit le paramètre utilisé.
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-4 z-50">
      <div className="card w-full max-w-md p-6">
        <h2 className="font-display font-bold text-lg text-ink mb-1">Partager la cotisation</h2>
        <p className="text-sm text-ink/60 mb-4">
          Ce lien est en lecture seule : les participants voient la progression sans avoir besoin de
          créer de compte.
        </p>

        <div className="flex items-center gap-2 mb-4">
          <input readOnly className="input-field text-sm" value={publicUrl} />
          <button onClick={handleCopy} className="btn-secondary text-sm shrink-0 whitespace-nowrap">
            {copied ? 'Copié !' : 'Copier'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 border border-line rounded-lg py-3 hover:bg-sand transition-colors"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#25D366"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.07L2 22l5.07-1.35A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2Zm0 18.15c-1.6 0-3.11-.43-4.4-1.19l-.32-.19-3.28.87.88-3.2-.2-.33A8.15 8.15 0 1 1 12 20.15Zm4.52-6.13c-.25-.12-1.47-.72-1.7-.81-.23-.08-.4-.12-.56.12-.17.25-.65.81-.8.97-.15.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.16-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.36-.77-1.86-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.87.86-.87 2.09s.9 2.42 1.02 2.59c.12.17 1.77 2.7 4.29 3.79.6.26 1.07.42 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.16-.48-.28Z"/></svg>
            <span className="text-[11px] font-medium text-ink/70">WhatsApp</span>
          </a>
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 border border-line rounded-lg py-3 hover:bg-sand transition-colors"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#26A5E4"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm4.64 6.8-1.63 7.68c-.12.55-.45.68-.9.43l-2.5-1.84-1.2 1.16c-.14.14-.25.25-.51.25l.18-2.55 4.63-4.19c.2-.18-.05-.28-.31-.1l-5.73 3.61-2.47-.77c-.54-.17-.55-.54.11-.8l9.65-3.72c.45-.16.84.1.68.84Z"/></svg>
            <span className="text-[11px] font-medium text-ink/70">Telegram</span>
          </a>
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 border border-line rounded-lg py-3 hover:bg-sand transition-colors"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.95.93-1.95 1.89v2.27h3.32l-.53 3.49h-2.79V24C19.61 23.09 24 18.1 24 12.07Z"/></svg>
            <span className="text-[11px] font-medium text-ink/70">Facebook</span>
          </a>
        </div>

        <button onClick={onClose} className="btn-secondary w-full mt-4">
          Fermer
        </button>
      </div>
    </div>
  );
}

function ReminderModal({
  groupId,
  member,
  onClose,
}: {
  groupId: string;
  member: { id: string; name: string };
  onClose: () => void;
}) {
  const [tone, setTone] = useState<ReminderTone>('amical');
  const [message, setMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tones: { value: ReminderTone; label: string }[] = [
    { value: 'amical', label: 'Amical / Humour' },
    { value: 'nouchi', label: 'Nouchi / Local' },
    { value: 'formel', label: 'Formel / Association' },
  ];

  async function handleGenerate(selectedTone: ReminderTone) {
    setTone(selectedTone);
    setError(null);
    setIsGenerating(true);
    try {
      const res = await api.post<{ message: string }>(
        `/groups/${groupId}/members/${member.id}/ai/reminder`,
        { tone: selectedTone },
      );
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Génération impossible');
    } finally {
      setIsGenerating(false);
    }
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-4 z-50">
      <div className="card w-full max-w-md p-6">
        <h2 className="font-display font-bold text-lg text-ink mb-1">Générer une relance</h2>
        <p className="text-sm text-ink/60 mb-4">{member.name}</p>

        <div className="flex gap-2 mb-4">
          {tones.map((t) => (
            <button
              key={t.value}
              onClick={() => handleGenerate(t.value)}
              disabled={isGenerating}
              className={`flex-1 text-xs font-medium py-2 px-2 rounded-lg border transition-colors ${
                tone === t.value && message
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'border-line text-ink/70 hover:bg-sand'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isGenerating && <p className="text-sm text-ink/50 text-center py-4">Génération en cours…</p>}
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {message && !isGenerating && (
          <textarea
            className="input-field text-sm mb-4"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        )}

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Fermer
          </button>
          {message && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex-1 flex items-center justify-center"
            >
              Envoyer sur WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function ScanContributionModal({
  group,
  onClose,
  onAdded,
}: {
  group: GroupSummary;
  onClose: () => void;
  onAdded: () => void;
}) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [scanImage, setScanImage] = useState<File | null>(null);
  const [scanText, setScanText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayStr);
  const [senderName, setSenderName] = useState('');
  const [transactionReference, setTransactionReference] = useState('');

  // 'existing' : le versement est rattaché à un membre déjà enregistré.
  // 'new' : un nouveau membre sera créé automatiquement à partir du nom détecté.
  const [memberMode, setMemberMode] = useState<'existing' | 'new'>('existing');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberExpectedAmount, setNewMemberExpectedAmount] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleScan() {
    if (!scanImage && !scanText.trim()) {
      setScanError('Ajoutez une capture d’écran ou collez le texte du SMS.');
      return;
    }
    setScanError(null);
    setIsScanning(true);
    try {
      const formData = new FormData();
      if (scanImage) formData.append('image', scanImage);
      if (scanText.trim()) formData.append('text', scanText.trim());

      const result = await api.postFormData<ReceiptScanResult>(
        `/groups/${group.id}/ai/scan-receipt`,
        formData,
      );

      if (result.amount != null) setAmount(String(result.amount));
      if (result.date) setPaymentDate(result.date <= todayStr ? result.date : todayStr);
      if (result.transactionId) setTransactionReference(result.transactionId);

      if (result.senderName) {
        setSenderName(result.senderName);
        // On cherche une correspondance parmi les membres déjà enregistrés
        // (comparaison insensible à la casse et aux espaces superflus).
        const normalized = result.senderName.trim().toLowerCase();
        const match = group.members.find((m) => m.displayName.trim().toLowerCase() === normalized);
        if (match) {
          setMemberMode('existing');
          setSelectedMemberId(match.id);
        } else {
          setMemberMode('new');
          setNewMemberName(result.senderName);
        }
      }

      setHasScanned(true);
    } catch (err) {
      setScanError(err instanceof ApiError ? err.message : "Échec de l'analyse");
    } finally {
      setIsScanning(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (paymentDate > todayStr) {
      setError('La date du versement ne peut pas être dans le futur.');
      return;
    }
    if (memberMode === 'existing' && !selectedMemberId) {
      setError('Sélectionnez le membre concerné.');
      return;
    }
    if (memberMode === 'new' && !newMemberName.trim()) {
      setError('Indiquez le nom du nouveau membre.');
      return;
    }

    setIsSubmitting(true);
    try {
      let memberId = selectedMemberId;

      if (memberMode === 'new') {
        const created = await api.post<{ id: string }>(`/groups/${group.id}/members`, {
          displayName: newMemberName.trim(),
          expectedAmount: newMemberExpectedAmount ? Number(newMemberExpectedAmount) : undefined,
        });
        memberId = created.id;
      }

      await api.post(`/groups/${group.id}/contributions`, {
        memberId,
        amount: Number(amount),
        paymentDate: new Date(paymentDate).toISOString(),
        paymentMethod: 'Mobile Money',
        senderName: senderName || undefined,
        transactionReference: transactionReference || undefined,
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
      <div className="card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="font-display font-bold text-lg text-ink mb-1">
          Nouveau versement par reçu
        </h2>
        <p className="text-sm text-ink/60 mb-4">
          Scannez un reçu Mobile Money : le membre est détecté automatiquement, ou créé s&apos;il
          n&apos;existe pas encore.
        </p>

        <div className="border border-line rounded-lg p-4 mb-4 bg-sand/50">
          <label className="label" htmlFor="scanImage2">Capture d’écran du reçu</label>
          <input
            id="scanImage2"
            type="file"
            accept="image/*"
            className="text-sm mb-3 block w-full"
            onChange={(e) => setScanImage(e.target.files?.[0] ?? null)}
          />

          <label className="label" htmlFor="scanText2">Ou collez le texte du SMS</label>
          <textarea
            id="scanText2"
            rows={2}
            className="input-field text-sm mb-3"
            placeholder="Ex : Vous avez reçu 25000 F CFA de Fatou D. le 12/08/2026..."
            value={scanText}
            onChange={(e) => setScanText(e.target.value)}
          />

          {scanError && <p className="text-xs text-red-600 mb-2">{scanError}</p>}

          <button
            type="button"
            onClick={handleScan}
            disabled={isScanning}
            className="btn-primary w-full text-sm"
          >
            {isScanning ? 'Analyse en cours…' : 'Analyser le reçu'}
          </button>
        </div>

        {hasScanned && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Membre</label>
              {memberMode === 'new' ? (
                <div className="bg-gold-100/50 border border-gold-400/30 rounded-lg p-3">
                  <p className="text-xs text-gold-600 font-medium mb-2">
                    Nouveau membre détecté — sera créé automatiquement à l&apos;enregistrement
                  </p>
                  <input
                    className="input-field text-sm"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                  />
                  <input
                    type="number"
                    min={1}
                    className="input-field text-sm mt-2"
                    placeholder="Montant attendu (optionnel — mode cotisation fixe)"
                    value={newMemberExpectedAmount}
                    onChange={(e) => setNewMemberExpectedAmount(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setMemberMode('existing');
                      setSelectedMemberId('');
                    }}
                    className="text-xs text-teal-600 hover:underline mt-2"
                  >
                    Choisir un membre existant à la place
                  </button>
                </div>
              ) : (
                <div>
                  <select
                    className="input-field"
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                  >
                    <option value="">— Sélectionner —</option>
                    {group.members.map((m) => (
                      <option key={m.id} value={m.id}>{m.displayName}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setMemberMode('new');
                      setNewMemberName(senderName);
                    }}
                    className="text-xs text-teal-600 hover:underline mt-2"
                  >
                    Créer un nouveau membre à la place
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="label" htmlFor="amount2">Montant</label>
              <input
                id="amount2"
                type="number"
                min={1}
                required
                className="input-field"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="paymentDate2">Date</label>
              <input
                id="paymentDate2"
                type="date"
                required
                max={todayStr}
                className="input-field"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="senderName2">Expéditeur</label>
                <input
                  id="senderName2"
                  className="input-field text-sm"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="transactionReference2">Réf. transaction</label>
                <input
                  id="transactionReference2"
                  className="input-field text-sm"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                />
              </div>
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
        )}

        {!hasScanned && (
          <button onClick={onClose} className="btn-secondary w-full">
            Annuler
          </button>
        )}
      </div>
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
  const [expectedAmount, setExpectedAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post(`/groups/${groupId}/members`, {
        displayName,
        phone: phone || undefined,
        expectedAmount: expectedAmount ? Number(expectedAmount) : undefined,
      });
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
          <div>
            <label className="label" htmlFor="expectedAmount">
              Montant attendu (optionnel)
            </label>
            <input
              id="expectedAmount"
              type="number"
              min={1}
              className="input-field"
              value={expectedAmount}
              onChange={(e) => setExpectedAmount(e.target.value)}
              placeholder="Laisser vide pour un mode libre"
            />
            <p className="text-xs text-ink/50 mt-1">
              Si renseigné, ce membre ne sera « à jour » qu&apos;une fois cette somme exacte versée.
            </p>
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
  const todayStr = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayStr);
  const [paymentMethod, setPaymentMethod] = useState('Mobile Money');
  const [notes, setNotes] = useState('');
  const [senderName, setSenderName] = useState('');
  const [transactionReference, setTransactionReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Scan intelligent de reçu ---
  const [showScan, setShowScan] = useState(false);
  const [scanImage, setScanImage] = useState<File | null>(null);
  const [scanText, setScanText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanApplied, setScanApplied] = useState(false);

  async function handleScan() {
    if (!scanImage && !scanText.trim()) {
      setScanError('Ajoutez une capture d’écran ou collez le texte du SMS.');
      return;
    }
    setScanError(null);
    setIsScanning(true);
    setScanApplied(false);
    try {
      const formData = new FormData();
      if (scanImage) formData.append('image', scanImage);
      if (scanText.trim()) formData.append('text', scanText.trim());

      const result = await api.postFormData<ReceiptScanResult>(
        `/groups/${groupId}/ai/scan-receipt`,
        formData,
      );

      if (result.amount != null) setAmount(String(result.amount));
      if (result.date) {
        // On ne remplit la date que si elle n'est pas dans le futur (règle du formulaire)
        setPaymentDate(result.date <= todayStr ? result.date : todayStr);
      }
      setPaymentMethod('Mobile Money');
      if (result.senderName) setSenderName(result.senderName);
      if (result.transactionId) setTransactionReference(result.transactionId);

      setScanApplied(true);
    } catch (err) {
      setScanError(err instanceof ApiError ? err.message : "Échec de l'analyse");
    } finally {
      setIsScanning(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Un versement daté dans le futur n'a pas de sens (le paiement n'a pas encore eu lieu).
    // Le passé, en revanche, est normal — surtout avec un reçu scanné après coup.
    if (paymentDate > todayStr) {
      setError('La date du versement ne peut pas être dans le futur.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/groups/${groupId}/contributions`, {
        memberId: member.id,
        amount: Number(amount),
        paymentDate: new Date(paymentDate).toISOString(),
        paymentMethod,
        notes: notes || undefined,
        senderName: senderName || undefined,
        transactionReference: transactionReference || undefined,
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
      <div className="card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="font-display font-bold text-lg text-ink mb-1">Enregistrer un versement</h2>
        <p className="text-sm text-ink/60 mb-4">{member.name}</p>

        {!showScan ? (
          <button
            onClick={() => setShowScan(true)}
            className="w-full flex items-center justify-center gap-2 border border-teal-600/30 bg-teal-50 text-teal-700 text-sm font-medium rounded-lg py-2.5 mb-4 hover:bg-teal-100 transition-colors"
          >
            📸 Scanner un reçu Mobile Money
          </button>
        ) : (
          <div className="border border-line rounded-lg p-4 mb-4 bg-sand/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-ink">Scan intelligent</span>
              <button
                type="button"
                onClick={() => setShowScan(false)}
                className="text-xs text-ink/50 hover:text-ink"
              >
                Fermer
              </button>
            </div>

            <label className="label" htmlFor="scanImage">Capture d’écran du reçu</label>
            <input
              id="scanImage"
              type="file"
              accept="image/*"
              className="text-sm mb-3 block w-full"
              onChange={(e) => setScanImage(e.target.files?.[0] ?? null)}
            />

            <label className="label" htmlFor="scanText">Ou collez le texte du SMS</label>
            <textarea
              id="scanText"
              rows={2}
              className="input-field text-sm mb-3"
              placeholder="Ex : Vous avez reçu 25000 F CFA de Fatou D. le 12/08/2026..."
              value={scanText}
              onChange={(e) => setScanText(e.target.value)}
            />

            {scanError && <p className="text-xs text-red-600 mb-2">{scanError}</p>}
            {scanApplied && (
              <p className="text-xs text-teal-600 mb-2">✓ Formulaire pré-rempli, vérifiez avant d’enregistrer.</p>
            )}

            <button
              type="button"
              onClick={handleScan}
              disabled={isScanning}
              className="btn-primary w-full text-sm"
            >
              {isScanning ? 'Analyse en cours…' : 'Analyser'}
            </button>
          </div>
        )}

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
              max={todayStr}
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
              <option>Mobile Money</option>
              <option>Espèces</option>
              <option>Virement</option>
              <option>Chèque</option>
              <option>Autre</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="notes">Notes (optionnel)</label>
            <input
              id="notes"
              className="input-field text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note libre..."
            />
          </div>

          {(senderName || transactionReference) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="senderName">Expéditeur</label>
                <input
                  id="senderName"
                  className="input-field text-sm"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="transactionReference">Réf. transaction</label>
                <input
                  id="transactionReference"
                  className="input-field text-sm"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                />
              </div>
            </div>
          )}

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