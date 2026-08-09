import type { Metadata } from 'next';
import { Sora, Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

const sora = Sora({ subsets: ['latin'], variable: '--font-sora', weight: ['600', '700'] });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: "COOP'APPLI — Gestion de cotisations et caisses communes",
  description:
    "Centralisez et suivez en temps réel les cotisations de votre association, tontine ou collecte d'événement.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${sora.variable} ${inter.variable} font-body`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
