import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/app/EmptyState";
import Logo from "@/components/app/Logo";

const NaoEncontrado = () => (
  <div className="surface-ink flex min-h-screen flex-col bg-background">
    <div className="container flex h-16 items-center">
      <Link to="/" className="rounded-sm" aria-label="G.A Auto Elétrica — início">
        <Logo />
      </Link>
    </div>

    <main className="container flex flex-1 items-center justify-center py-10">
      <div className="w-full max-w-md">
        <EmptyState
          icone={Compass}
          titulo="Esta página não existe"
          descricao="O link pode estar errado ou a página mudou de lugar."
          acao={
            <Button asChild>
              <Link to="/">Voltar ao início</Link>
            </Button>
          }
        />
      </div>
    </main>
  </div>
);

export default NaoEncontrado;
