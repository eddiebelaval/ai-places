import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development';
const productionOrigins = ['https://xplaces.art', 'https://www.xplaces.art'];
const devOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const allowedOrigins = isDev ? [...productionOrigins, ...devOrigins] : productionOrigins;

const nextConfig = {
  reactStrictMode: true,

  // Note: @x-place/shared is pre-compiled to ESM in dist/
  // No transpilePackages needed - resolves from node_modules

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
          { key: 'Access-Control-Allow-Origin', value: allowedOrigins.join(', ') },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
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
