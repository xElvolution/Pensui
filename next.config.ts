import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@mysten/walrus", "@mysten/walrus-wasm"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "aggregator.walrus-testnet.walrus.space",
      },
    ],
  },
};

export default nextConfig;
