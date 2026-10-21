import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // o lint roda separado; o eslint.config.js do site antigo quebraria o build
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ["@react-pdf/renderer"],
  outputFileTracingIncludes: {
    // o pdfkit carrega as fontes padrão por caminho montado em tempo de
    // execução, então o Next não as enxerga sozinho e o PDF quebra em produção
    "/api/orcamento/[osId]/pdf": [
      "./node_modules/pdfkit/js/standard-fonts/**",
      "./node_modules/pdfkit/js/data/**",
      "./public/logo.png",
      "./public/fonts/**",
    ],
  },
};

export default nextConfig;
