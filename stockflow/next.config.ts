import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Move things out of experimental that are now standard or removed
  // Remove 'serverExternalPackages' from experimental if it's failing
  // Remove 'eslint' block if you're using the new CLI defaults

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
