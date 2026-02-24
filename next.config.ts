import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev({ configPath: "wrangler.dev.jsonc" });

const nextConfig: NextConfig = {
  experimental: {
    inlineCss: true,
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
