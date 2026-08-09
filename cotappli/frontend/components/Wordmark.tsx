import Image from 'next/image';

export function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <Image src="/logo.png" alt="COOP'APPLI" width={32} height={32} priority />
      <span className="font-display font-bold text-lg text-teal-700">COOP&apos;APPLI</span>
    </div>
  );
}