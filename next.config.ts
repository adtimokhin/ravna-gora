import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
      { protocol: "https", hostname: "*.supabase.co" },
      // Cloudflare Worker serving newspaper PDFs/cover images (NEXT_PUBLIC_WORKER_URL).
      { protocol: "https", hostname: "delicate-term-de7d.pokret-ravne-gore.workers.dev" },
      { protocol: "http", hostname: "localhost", port: "8787" },
    ],
  },
};

export default withNextIntl(nextConfig);
