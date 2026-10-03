import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Entrada from "./pages/Entrada";
import Entrar from "./pages/Entrar";
import Painel from "./pages/Painel";
import NovaOrdem from "./pages/NovaOrdem";
import Ordem from "./pages/Ordem";
import Conta from "./pages/Conta";
import Oficina from "./pages/Oficina";
import NaoEncontrado from "./pages/NaoEncontrado";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: true },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            {/* Público */}
            <Route path="/" element={<Entrada />} />
            <Route path="/entrar" element={<Entrar />} />

            {/* Área do cliente */}
            <Route
              path="/painel"
              element={
                <ProtectedRoute>
                  <Painel />
                </ProtectedRoute>
              }
            />
            <Route
              path="/painel/nova"
              element={
                <ProtectedRoute>
                  <NovaOrdem />
                </ProtectedRoute>
              }
            />
            <Route
              path="/painel/os/:id"
              element={
                <ProtectedRoute>
                  <Ordem />
                </ProtectedRoute>
              }
            />
            <Route
              path="/conta"
              element={
                <ProtectedRoute>
                  <Conta />
                </ProtectedRoute>
              }
            />

            {/* Área da oficina */}
            <Route
              path="/oficina"
              element={
                <ProtectedRoute>
                  <Oficina />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NaoEncontrado />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
