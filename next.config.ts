import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Privy ships modern ESM packages that Next should transpile.
  transpilePackages: ["@privy-io/react-auth"],
  // Bust sticky Try Live / browser caches for cast banner JPGs
  async headers() {
    return [
      {
        source: "/cast-hero-:version.jpg",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
  // Keep webpack polyfill shims for walletconnect / Privy deps without mutating
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
    // Privy optional Solana paths — keep as CommonJS externals for webpack builds.
    const solanaExternals = {
      "@solana/kit": "commonjs @solana/kit",
      "@solana-program/memo": "commonjs @solana-program/memo",
      "@solana-program/system": "commonjs @solana-program/system",
      "@solana-program/token": "commonjs @solana-program/token",
    };
    if (typeof config.externals === "function") {
      const original = config.externals;
      config.externals = async (...args: Parameters<typeof original>) => {
        const result = await original(...args);
        return { ...(typeof result === "object" && result ? result : {}), ...solanaExternals };
      };
    } else if (Array.isArray(config.externals)) {
      config.externals.push(solanaExternals);
    } else if (config.externals && typeof config.externals === "object") {
      config.externals = { ...config.externals, ...solanaExternals };
    } else {
      config.externals = solanaExternals;
    }
    return config;
  },
};

export default nextConfig;
