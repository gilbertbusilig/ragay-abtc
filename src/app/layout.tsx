import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';

// Single font load for faster performance
const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  weight: ['400','600','700','800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ragay ABTC — Animal Bite Treatment Center',
  description: 'Patient management system — Ragay, Camarines Sur',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
