import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // o lint roda separado; o eslint.config.js do site antigo quebraria o build
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ["@react-pdf/renderer"],
  // garante que a logo e as fontes do PDF existam no servidor em produção
  outputFileTracingIncludes: {
    "/api/orcamento/[osId]/pdf": ["./public/logo.png", "./public/fonts/**"],
  },
};

export default nextConfig;
