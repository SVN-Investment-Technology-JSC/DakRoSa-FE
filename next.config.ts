import type { NextConfig } from 'next';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    // Prevent Next from inferring the parent workspace from its lockfile.
    root: projectRoot,
  },
  async rewrites() {
    return [
      {
        source: '/t/:tenantSlug/maintenance/calendar',
        destination: '/t/:tenantSlug/maintenance-calendar',
      },
      {
        source: '/t/:tenantSlug/maintenance/schedules',
        destination: '/t/:tenantSlug/maintenance-schedules',
      },
      {
        source: '/t/:tenantSlug/maintenance/job-plans',
        destination: '/t/:tenantSlug/maintenance-job-plans',
      },
      {
        source: '/t/:tenantSlug/maintenance/workflows',
        destination: '/t/:tenantSlug/maintenance-workflows',
      },
      {
        source: '/api/:path*',
        destination: 'http://backend:8080/api/:path*',
      },
    ];
  },
};

export default nextConfig;
