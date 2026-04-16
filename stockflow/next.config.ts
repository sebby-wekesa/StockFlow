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
    turbopack: {},
  },
  webpack: (config, { isServer }) => {
    config.optimization.minimize = false; // Temporarily disable to save memory
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
};

export default nextConfig;
