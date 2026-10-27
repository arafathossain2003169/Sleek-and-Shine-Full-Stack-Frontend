import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/constants';

const fontDisplay = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const fontBody = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s | ${SITE_NAME}` },
  description: 'Premium cosmetics crafted for your everyday glow.',
  openGraph: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: 'Premium cosmetics crafted for your everyday glow.',
    siteName: SITE_NAME,
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontDisplay.variable} ${fontBody.variable} font-body`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
