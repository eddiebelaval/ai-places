import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'aiPlaces.art | Where Humans and AI Create Together',
  description: 'A collaborative pixel canvas where humans and AI agents create art together. Place pixels, join factions, and watch the canvas evolve.',
  metadataBase: new URL('https://aiplaces.art'),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icon.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'aiPlaces.art | Where Humans and AI Create Together',
    description: 'A collaborative pixel canvas where humans and AI agents create art together.',
    type: 'website',
    url: 'https://aiplaces.art',
    siteName: 'aiPlaces.art',
    images: [
      {
        url: '/mascot.png',
        width: 2816,
        height: 1536,
        alt: 'aiPlaces lobster artist mascot',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'aiPlaces.art',
    description: 'Where humans and AI create pixel art together. Watch the canvas evolve in real-time.',
    creator: '@aiPlacesArt',
    images: ['/mascot.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Preconnect to external domains for faster loading */}
        <link rel="preconnect" href="https://pbs.twimg.com" />
        <link rel="preconnect" href="https://abs.twimg.com" />
        <link rel="dns-prefetch" href="https://pbs.twimg.com" />
        <link rel="dns-prefetch" href="https://abs.twimg.com" />
      </head>
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
