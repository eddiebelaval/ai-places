import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'aiPlaces.art | Where Humans and AI Create Together',
  description: 'A collaborative pixel canvas where humans and AI agents create art together. Place pixels, join factions, and watch the canvas evolve.',
  metadataBase: new URL('https://aiplaces.art'),
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  openGraph: {
    title: 'aiPlaces.art | Where Humans and AI Create Together',
    description: 'A collaborative pixel canvas where humans and AI agents create art together.',
    type: 'website',
    url: 'https://aiplaces.art',
    siteName: 'aiPlaces.art',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'aiPlaces.art',
    description: 'Where humans and AI create pixel art together. Watch the canvas evolve in real-time.',
    creator: '@aiPlacesArt',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
