import { Link } from "react-router-dom";
import {
  Battery,
  Cpu,
  FileText,
  Gauge,
  KeyRound,
  Lock,
  ShieldCheck,
  Wrench,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { OFICINA } from "@/config/contato";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import heroImagem from "@/assets/hero-bg.jpg";

/* SCREEN 1 — Entrada.
   Objetivo: entender em 5 segundos que aqui se acompanha o carro, e entrar. */

const PASSOS = [
  {
    icone: FileText,
    titulo: "Abra a ordem",
    texto: "Placa, serviço e o que está acontecendo. Leva menos de um minuto.",
  },
  {
    icone: Gauge,
    titulo: "Acompanhe o status",
    texto: "Na fila, em andamento, concluído — com data em cada etapa.",
  },
  {
    icone: KeyRound,
    titulo: "Retire o carro",
    texto: "Você vê que ficou pronto sem precisar ligar para saber.",
  },
];

const SERVICOS = [
  {
    icone: Zap,
    titulo: "Sistema elétrico",
    texto: "Diagnóstico por scanner, reparo de chicote e instalação de acessórios.",
  },
  {
    icone: Battery,
    titulo: "Bateria e alternador",
    texto: "Teste de carga, limpeza de terminais e troca de alternador.",
  },
  {
    icone: Cpu,
    titulo: "Injeção eletrônica",
    texto: "Leitura de falhas, limpeza de bicos e ajuste da central.",
  },
  {
    icone: Wrench,
    titulo: "Sistema de ignição",
    texto: "Velas, bobinas e cabos — o motor voltando a pegar de primeira.",
  },
  {
    icone: ShieldCheck,
    titulo: "Alarme, trava e vidro",
    texto: "Instalação e conserto de alarme, trava elétrica e vidro elétrico.",
  },
  {
    icone: Gauge,
    titulo: "Revisão preventiva",
    texto: "Check-up dos sistemas elétricos antes do problema aparecer.",
  },
];

const Entrada = () => {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <SiteHeader />

      <main id="conteudo" className="flex-1">
        {/* ---------------------------------------------------------- Hero */}
        <section className="surface-ink relative overflow-hidden bg-background pb-16 pt-28 sm:pb-20 sm:pt-32">
          <img
            src={heroImagem}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-20"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-br from-background via-background/90 to-background"
          />

          <div className="container relative">
            <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
              <div className="animate-fade-up">
                <p className="inline-flex items-center gap-2 rounded-sm bg-accent px-3 py-1 text-caption text-accent-foreground">
                  <Zap size={14} aria-hidden="true" />
                  AUTO ELÉTRICA EM UBERABA
                </p>

                <h1 className="mt-5 max-w-xl text-display-l text-white sm:text-display-xl">
                  Seu carro na oficina, sem telefonema.
                </h1>

                <p className="mt-4 max-w-lg text-body text-white/75">
                  Abra a ordem de serviço aqui e acompanhe cada etapa do reparo — da fila
                  da bancada até a hora de buscar.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button variant="accent" size="lg" asChild>
                    <Link to={user ? "/painel" : "/entrar"}>
                      {user ? "Ir para meu painel" : "Entrar e acompanhar"}
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    asChild
                    className="text-white hover:bg-white/10 hover:text-white"
                  >
                    <a href="#servicos">Ver serviços</a>
                  </Button>
                </div>
              </div>

              {/* Três provas — o que o produto realmente faz hoje. */}
              <ul className="grid gap-3">
                {PASSOS.map(({ icone: Icone, titulo, texto }) => (
                  <li
                    key={titulo}
                    className="flex gap-4 rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-accent text-accent-foreground">
                      <Icone size={18} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-small font-medium text-white">{titulo}</span>
                      <span className="mt-0.5 block text-small text-white/65">{texto}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ Serviços */}
        <section id="servicos" className="py-16 sm:py-20">
          <div className="container">
            <h2 className="max-w-xl text-display-m text-foreground sm:text-display-l">
              O que a oficina resolve
            </h2>
            <p className="mt-2 max-w-xl text-body text-muted-foreground">
              Se o problema do seu carro é elétrico, ele está nesta lista — ou vira um
              diagnóstico para descobrir onde está.
            </p>

            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SERVICOS.map(({ icone: Icone, titulo, texto }) => (
                <li
                  key={titulo}
                  className="rounded-xl border border-border bg-card p-6 shadow-raised"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-muted text-foreground">
                    <Icone size={18} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-title text-foreground">{titulo}</h3>
                  <p className="mt-1 text-small text-muted-foreground">{texto}</p>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-title text-foreground">Pronto para deixar o carro?</p>
                <p className="mt-1 text-small text-muted-foreground">
                  {OFICINA.horario.dias}, {OFICINA.horario.faixa}. A oficina confirma o
                  horário depois que você abre a ordem.
                </p>
              </div>
              <Button size="lg" asChild className="w-full shrink-0 sm:w-auto">
                <Link to={user ? "/painel/nova" : "/entrar"}>Abrir ordem de serviço</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- Confiança */}
        <section className="border-t border-border bg-card py-12">
          <div className="container flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
            <Lock size={20} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="max-w-2xl text-small text-muted-foreground">
              Cada cliente vê apenas os próprios veículos e ordens. O acesso é por e-mail e
              senha, e nenhum dado do seu carro aparece para outro cliente.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Entrada;
