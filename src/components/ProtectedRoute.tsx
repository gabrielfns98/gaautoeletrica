import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/** Barra rotas da área logada. Guarda de onde o usuário veio para voltar depois de entrar. */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="surface-ink flex min-h-screen items-center justify-center bg-background">
        <p className="text-small text-white/70" role="status">
          Carregando…
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/entrar" state={{ de: location.pathname }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
