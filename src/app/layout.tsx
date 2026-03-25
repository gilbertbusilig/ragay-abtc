import type { Metadata } from 'next';
import { Outfit, Lora } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', weight: ['300','400','500','600','700'] });
const lora = Lora({ subsets: ['latin'], variable: '--font-lora', style: ['normal','italic'] });

export const metadata: Metadata = {
  title: 'Ragay ABTC',
  description: 'Animal Bite Treatment Center — Ragay, Camarines Sur',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${lora.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
