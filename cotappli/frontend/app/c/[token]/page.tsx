import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Wordmark } from '@/components/Wordmark';
import { ProgressBar, formatAmount } from '@/components/ProgressBar';
import type { PublicGroupView } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function fetchPublicGroup(token: string): Promise<PublicGroupView | null> {
  const res = await fetch(`${API_URL}/public/${token}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  const group = await fetchPublicGroup(params.token);
  if (!group) return { title: "Cotisation introuvable — COOP'APPLI" };

  const description = `Organisé par ${group.organizerName} · ${formatAmount(group.totalCollected, group.currency)} / ${formatAmount(group.targetAmount, group.currency)} collectés (${group.progressPercent}%)`;

  return {
    title: `${group.title} — COOP'APPLI`,
    description,
    openGraph: {
      title: group.title,
      description,
      type: 'website',
    },
  };
}

export default async function PublicGroupPage({ params }: { params: { token: string } }) {
  const group = await fetchPublicGroup(params.token);
  if (!group) notFound();

  return (
    <div className="min-h-screen bg-sand">
      <header className="border-b border-line bg-white">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center">
          <Wordmark />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* A. En-tête de la cotisation */}
        <div className="card p-6 mb-5">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-display font-bold text-2xl text-ink">{group.title}</h1>
            {group.status === 'CLOSED' && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gold-100 text-gold-600 shrink-0">
                Clôturée
              </span>
            )}
          </div>
          <p className="text-sm text-ink/60 mt-1">Organisé par {group.organizerName}</p>
          {group.description && <p className="text-sm text-ink/70 mt-3">{group.description}</p>}
        </div>

        {/* B. Jauge de progression */}
        <div className="card p-6 mb-5">
          <ProgressBar percent={group.progressPercent} />
          <div className="flex items-center justify-between mt-3">
            <span className="text-sm text-ink/70">
              {formatAmount(group.totalCollected, group.currency)} sur{' '}
              {formatAmount(group.targetAmount, group.currency)}
            </span>
            <span className="font-display font-bold text-teal-600 text-lg">
              {group.progressPercent}%
            </span>
          </div>
        </div>

        {/* C. Tableau de transparence */}
        <div className="mb-5">
          <h2 className="font-display font-semibold text-ink mb-2 px-1">Suivi des participants</h2>
          <div className="card divide-y divide-line">
            {group.members.length === 0 && (
              <p className="p-5 text-sm text-ink/50">Aucun participant enregistré pour l&apos;instant.</p>
            )}
            {group.members.map((member, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-ink">{member.displayName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink/70">
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
                    {member.status === 'a_jour' ? 'À jour' : 'En attente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* D. Instructions de paiement */}
        {group.paymentInstructions && (
          <div className="card p-5 mb-5 bg-teal-50 border-teal-100">
            <p className="text-sm font-medium text-teal-700 mb-1">Comment verser votre part</p>
            <p className="text-sm text-teal-700/80">{group.paymentInstructions}</p>
          </div>
        )}

        {/* CTA viralité */}
        <div className="text-center py-6">
          <p className="text-sm text-ink/60 mb-3">Vous organisez une collecte ?</p>
          <Link href="/register" className="btn-primary inline-block">
            Créez votre groupe gratuitement sur COOP&apos;APPLI
          </Link>
        </div>
      </main>
    </div>
  );
}
