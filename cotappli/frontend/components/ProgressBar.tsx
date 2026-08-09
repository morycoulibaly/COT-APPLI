export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="w-full h-2.5 bg-teal-50 rounded-full overflow-hidden">
      <div
        className="h-full bg-gold-400 rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

export function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount) + ' ' + currency;
}
