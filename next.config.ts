import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  distDir: process.env.UZEX_TEST_SERVER === "1" ? ".next-e2e" : ".next",
  devIndicators: false,
  serverExternalPackages: ["@google/genai"],
  // Local registry files are provisioned on the machine, never bundled into a deployment.
  outputFileTracingExcludes: { "/*": ["./data/**/*", "./*.csv"] },
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
