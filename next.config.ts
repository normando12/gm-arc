import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@relayprotocol/relay-kit-ui",
    "@relayprotocol/relay-sdk",
  ],
  // Keep webpack polyfill shims for walletconnect deps without mutating
  // Next's externals (which may be a function and must not be spread).
  webpack: (config) => {
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      "pino-pretty": false,
      encoding: false,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
