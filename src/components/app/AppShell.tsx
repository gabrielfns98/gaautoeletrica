import { Link, NavLink, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Settings, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";
import Logo from "./Logo";

interface AppShellProps {
  children: React.ReactNode;
  /** Largura do conteúdo. `estreito` para formulários. */
  largura?: "padrao" | "estreito";
}

/**
 * Casca da área logada: cabeçalho ink fixo + conteúdo.
 * Um só menu à direita — Conta, Oficina (admin) e Sair.
 */
const AppShell = ({ children, largura = "padrao" }: AppShellProps) => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  const sair = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const identidade = user?.email ?? "Minha conta";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>

      <header className="surface-ink sticky top-0 z-40 border-b border-white/10 bg-background">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link
            to="/painel"
            className="rounded-sm focus-visible:outline-none"
            aria-label="G.A Auto Elétrica — ir para o painel"
          >
            <Logo />
          </Link>

          <nav className="flex items-center gap-1" aria-label="Navegação da conta">
            <NavLink
              to="/painel"
              className={({ isActive }) =>
                cn(
                  "hidden rounded-md px-3 py-2 text-small font-medium transition-colors duration-fast sm:block",
                  isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
                )
              }
            >
              Painel
            </NavLink>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="max-w-[9rem] gap-1.5 px-2.5 text-white hover:bg-white/10 hover:text-white sm:max-w-[14rem] sm:px-3"
                >
                  <span className="truncate text-small">{identidade}</span>
                  <ChevronDown size={16} aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <span className="block text-caption font-normal tracking-normal text-muted-foreground">
                    Conectado como
                  </span>
                  <span className="block truncate text-small text-foreground">{identidade}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/painel" className="sm:hidden">
                    <Wrench size={16} aria-hidden="true" />
                    Painel
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/conta">
                    <Settings size={16} aria-hidden="true" />
                    Conta e veículos
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/oficina">
                      <Wrench size={16} aria-hidden="true" />
                      Área da oficina
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={sair}>
                  <LogOut size={16} aria-hidden="true" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </header>

      <main
        id="conteudo"
        className={cn(
          "container flex-1 py-8 sm:py-10",
          largura === "estreito" && "max-w-[560px]",
        )}
      >
        {children}
      </main>
    </div>
  );
};

export default AppShell;
