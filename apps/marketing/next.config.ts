import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@app/ui", "@app/shared", "@app/icons", "@app/tailwind-config"],
  reactStrictMode: true,
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
