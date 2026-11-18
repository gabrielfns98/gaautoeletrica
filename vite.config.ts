import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const SITE_URL = "https://ga-curso-natal.vercel.app";
const titulo = "Treinamento de Natal: Autoelétrica básica para iniciantes | G.A. Auto Elétrica";
const descricao =
  "Aprenda o essencial da elétrica automotiva mesmo sem nenhuma noção. 18 e 19/12 em Uberaba-MG. Ganhe multímetro, apostila e certificado de 13 horas.";

/** No site do curso, troca título e descrição do index.html (prévia no WhatsApp/Google). */
const htmlDoCurso = (): Plugin => ({
  name: "html-do-curso",
  transformIndexHtml: (html) =>
    html
      .replace(/<title>.*<\/title>/, `<title>${titulo}</title>`)
      .replace(/(<meta (?:name="description"|property="og:description") content=")[^"]*"/g, `$1${descricao}"`)
      .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${titulo}"`)
      .replace(/\s*<meta (?:property="og:image"|name="twitter:[^"]*")[^>]*>/g, "")
      .replace(
        "</head>",
        `    <meta property="og:image" content="${SITE_URL}/curso-og.jpg" />\n    <meta property="og:image:width" content="1200" />\n    <meta property="og:image:height" content="628" />\n    <meta name="twitter:card" content="summary_large_image" />\n  </head>`,
      ),
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    (mode === 'curso' || mode === 'demo') && htmlDoCurso(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
