/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile local workspace packages that ship TS/TSX so Next can process them
  transpilePackages: ['@lfd/ui', '@lfd/types'],
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
