/** @type {import('next').NextConfig} */
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

  // Headers for security
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
    ];
  },
};

export default nextConfig;
