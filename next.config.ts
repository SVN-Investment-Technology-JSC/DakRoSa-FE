import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:8080/api/:path*',
      },
    ];
  },
};

export default nextConfig;
