import { createRoot } from 'react-dom/client'
import './index.css'

const root = createRoot(document.getElementById("root")!);

// `--mode curso`/`--mode demo` geram o site independente do Treinamento de Natal.
if (import.meta.env.VITE_SITE === "curso") {
  import("./CursoApp.tsx").then(({ default: CursoApp }) => root.render(<CursoApp />));
} else {
  import("./App.tsx").then(({ default: App }) => root.render(<App />));
}
