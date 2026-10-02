import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone output = self-contained server for Docker / VPS deploys.
  // Vercel ignores this safely and still works.
  output: "standalone",
};

export default nextConfig;
