import { withSentryConfig } from '@sentry/nextjs';
import withPWAInit from 'next-pwa';

/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development';

// PWA configuration
const withPWA = withPWAInit({
  dest: 'public',
  disable: isDev,
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    // Cache images with CacheFirst strategy (30 days)
    {
      urlPattern: /^https?.*\.(png|jpg|jpeg|webp|svg|gif|ico)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    // Cache fonts with CacheFirst strategy (1 year)
    {
      urlPattern: /^https?.*\.(woff|woff2|ttf|otf|eot)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'fonts-cache',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    // Cache API requests with NetworkFirst strategy (1 hour fallback)
    {
      urlPattern: /^https?.*\/api\/.*$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60, // 1 hour
        },
      },
    },
    // Cache static JS/CSS with StaleWhileRevalidate
    {
      urlPattern: /^https?.*\.(js|css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
  ],
});
// CORS: Access-Control-Allow-Origin only accepts a single origin or '*'
// In development, use '*' for convenience. In production, use the primary origin.
// For dynamic origin validation, implement middleware instead of static headers.
const corsOrigin = isDev ? '*' : 'https://aiplaces.art';

const nextConfig = {
  reactStrictMode: true,

  // Transpile workspace packages for Turbopack compatibility
  transpilePackages: ['@aiplaces/shared'],

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com', // X profile images
      },
      {
        protocol: 'https',
        hostname: 'abs.twimg.com',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },

  // Headers for security and CORS
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      // CORS for API routes
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: corsOrigin },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, x-agent-api-key' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
    ];
  },
};

// Wrap with PWA and Sentry (Sentry only active when SENTRY_DSN is set)
export default withSentryConfig(withPWA(nextConfig), {
  // Sentry options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Suppress source map upload errors when no auth token
  silent: !process.env.SENTRY_AUTH_TOKEN,

  // Upload source maps for better stack traces
  widenClientFileUpload: true,

  // Automatically inject Sentry SDK for Vercel
  automaticVercelMonitors: true,
});
