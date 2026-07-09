import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  ...(process.env.NEXT_OUTPUT_STANDALONE === 'true' ? { output: 'standalone' as const } : {}),
  typedRoutes: true,
  typescript:
    process.env.SITE_AUDIT_SKIP_NEXT_TYPECHECK === 'true'
      ? {
          ignoreBuildErrors: true,
        }
      : undefined,
};

export default nextConfig;
