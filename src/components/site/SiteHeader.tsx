import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/app/Logo";

/** Cabeçalho do site público. Uma ação: entrar. */
const SiteHeader = () => {
  const { user, loading } = useAuth();

  return (
    <header className="surface-ink absolute inset-x-0 top-0 z-40">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="rounded-sm" aria-label="G.A Auto Elétrica — início">
          <Logo />
        </Link>

        <nav className="flex items-center gap-2" aria-label="Acesso">
          <Button
            variant="ghost"
            asChild
            className="hidden text-white hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            <a href="#servicos">Serviços</a>
          </Button>
          {!loading && (
            <Button variant="accent" asChild>
              <Link to={user ? "/painel" : "/entrar"}>{user ? "Meu painel" : "Entrar"}</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};

export default SiteHeader;
