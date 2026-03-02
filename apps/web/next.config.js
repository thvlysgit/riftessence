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
  transpilePackages: ['@lfd/ui', '@lfd/types', '@tanstack/react-query', '@tanstack/query-core', '@vercel/analytics'],
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
