/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Force webpack to bundle ESM-only packages (e.g. @tanstack/react-query v5) instead of
  // loading them natively in the SSR Lambda, which causes ESM/CJS interop SyntaxErrors.
  experimental: {
    esmExternals: 'loose',
  },
  // Transpile local workspace packages that ship TS/TSX so Next can process them
  transpilePackages: ['@lfd/ui', '@lfd/types', '@tanstack/react-query', '@tanstack/query-core'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ddragon.leagueoflegends.com',
        pathname: '/cdn/**',
      },
    ],
  },
};

module.exports = nextConfig;
