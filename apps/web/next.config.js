const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable native ESM externals: force ALL packages through webpack bundler during SSR.
  // Without this, .mjs packages (e.g. @vercel/analytics, @tanstack/react-query) are loaded
  // by Node's native ESM loader which cannot interop with CJS React → SyntaxError in Lambda.
  experimental: {
    esmExternals: false,
  },
  // Transpile local workspace packages that ship TS/TSX so Next can process them
  transpilePackages: ['@lfd/types', '@tanstack/react-query', '@tanstack/query-core', '@vercel/analytics'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ddragon.leagueoflegends.com',
        pathname: '/cdn/**',
      },
    ],
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['client-only'] = require('path').resolve(__dirname, 'src/shims/client-only.js');
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
