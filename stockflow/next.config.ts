import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Move things out of experimental that are now standard or removed
  // Remove 'serverExternalPackages' from experimental if it's failing
  // Remove 'eslint' block if you're using the new CLI defaults

  // If you need to ignore linting during build in v16:
  // (Check the new documentation as the 'eslint' key was flagged)
};

export default nextConfig;
