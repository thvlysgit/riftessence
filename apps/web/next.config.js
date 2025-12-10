/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile local workspace packages that ship TS/TSX so Next can process them
  transpilePackages: ['@lfd/ui', '@lfd/types'],
};

module.exports = nextConfig;
