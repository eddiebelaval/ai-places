import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development';
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

// Wrap with Sentry (only active when SENTRY_DSN is set)
export default withSentryConfig(nextConfig, {
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
