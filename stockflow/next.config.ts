import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip linting during build to save memory
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Skip type checking during build (optional, but saves even more RAM)
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverExternalPackages: ['@prisma/client'],
  },
};

export default nextConfig;
