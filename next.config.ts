import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  distDir: process.env.UZEX_TEST_SERVER === "1" ? ".next-e2e" : ".next",
  devIndicators: false,
  serverExternalPackages: ["@google/genai"],
  // Ship only the compact immutable snapshot, never the raw workstation database/CSVs.
  outputFileTracingExcludes: {
    "/*": ["./data/registry.sqlite", "./data/*.tmp", "./data/*.gz", "./*.csv"],
  },
  outputFileTracingIncludes:
    process.env.REGISTRY_SNAPSHOT === "1"
      ? { "/api/*": ["./data/registry.vercel.sqlite"] }
      : undefined,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default config;
