import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Build do produto Bancada: entrada própria, sem a aplicação hospedeira.
// A flag abaixo é lida por src/lims/base.ts e move as rotas do sistema
// de /lab para a raiz do domínio.
export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, "apps/bancada"),
  // As variáveis moram na raiz do repositório, não na pasta da entrada.
  envDir: __dirname,
  publicDir: false,
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  define: {
    "import.meta.env.VITE_BANCADA_SOZINHA": JSON.stringify("1"),
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
});
