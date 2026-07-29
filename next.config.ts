import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
// Defined in lib/security/headers.ts, not here, so a unit test can pin the
// Content-Security-Policy: this file runs initOpenNextCloudflareForDev() on
// import, which makes it impractical to load from Vitest.
import { securityHeaders } from "./lib/security/headers";

initOpenNextCloudflareForDev({ configPath: "wrangler.dev.jsonc" });

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  experimental: {
    optimizePackageImports: ["@hugeicons/core-free-icons", "@hugeicons/react"],
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  images: {
    loader: "custom",
    loaderFile: "./lib/utils/cloudflare-image-loader.ts",
  },
};

export default nextConfig;
