import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  Check,
  ClipboardList,
  MapPin,
  QrCode,
  Send,
  Users,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import InscricaoForm from "@/components/curso/InscricaoForm";
import Pagamento, { type InscricaoSalva } from "@/components/curso/Pagamento";
import { MultimeterIcon, WhatsAppIcon } from "@/components/curso/icons";
import { CURSO, MODO_DEMO, formatBRL, whatsappLink } from "@/config/curso";
import banner from "@/assets/curso-banner.jpg";

const STORAGE_KEY = `ga-curso-${CURSO.turma}-v2`;

const CONTEUDO = [
  "Noções de eletricidade aplicada a veículos",
  "Funcionamento do sistema elétrico",
  "Bateria e sistema de carga",
  "Motor de partida",
  "Alternador",
  "Fusíveis, relés e chicotes",
  "Diagnóstico de falhas básicas",
];

const BRINDES = [
  { icon: MultimeterIcon, titulo: "Multímetro", sub: "de brinde" },
  { icon: BookOpen, titulo: "Apostila", sub: "completa, com exercícios" },
  { icon: Award, titulo: "Certificado", sub: `de ${CURSO.cargaHoraria} horas` },
];

const PASSOS = [
  { icon: ClipboardList, titulo: "Preencha seus dados", texto: "Leva menos de 1 minuto." },
  { icon: QrCode, titulo: "Pague por Pix ou cartão", texto: "QR Code na hora ou link de pagamento." },
  { icon: Send, titulo: "Envie o comprovante", texto: "Pelo WhatsApp, e sua vaga está garantida." },
];

const FAQ = [
  {
    p: "Preciso saber alguma coisa de elétrica?",
    r: "Não. O treinamento foi pensado para iniciantes: começamos do zero, com noções de eletricidade aplicada a veículos, e vamos até o diagnóstico de falhas básicas.",
  },
  {
    p: "O que eu recebo?",
    r: `Cada participante ganha um multímetro, a apostila completa com exercícios e o certificado de ${CURSO.cargaHoraria} horas.`,
  },
  {
    p: "Quais são os dias e horários?",
    r: CURSO.datas.map((d) => `${d.dia}, ${d.data}, ${d.horario}`).join(" e ") + ". É preciso participar dos dois dias.",
  },
  {
    p: "Como faço o pagamento?",
    r: "Depois de preencher a inscrição, você escolhe: Pix (QR Code ou Copia e Cola) ou cartão pelo link de pagamento. Em seguida, é só enviar o comprovante pelo WhatsApp.",
  },
  {
    p: "Quando minha vaga fica confirmada?",
    r: "Assim que recebermos o comprovante de pagamento. Nós respondemos pelo WhatsApp confirmando sua inscrição.",
  },
  {
    p: "Onde vai ser?",
    r: `${CURSO.endereco.linha1}, ${CURSO.endereco.linha2}.`,
  },
];

const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-2 rounded-full bg-curso-ink px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-curso-yellow sm:text-xs">
    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
    {children}
  </span>
);

const Eyebrow = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <p className={`text-[11px] font-bold uppercase tracking-[0.22em] text-curso-muted sm:text-xs ${className}`}>{children}</p>
);

const CursoNatal = () => {
  const [inscricao, setInscricao] = useState<InscricaoSalva | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as InscricaoSalva) : null;
    } catch {
      return null;
    }
  });
  const [formVisivel, setFormVisivel] = useState(false);
  const inscricaoRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tituloAnterior = document.title;
    document.title = "Treinamento de Natal: Autoelétrica básica para iniciantes | G.A. Auto Elétrica";
    return () => {
      document.title = tituloAnterior;
    };
  }, []);

  useEffect(() => {
    const el = inscricaoRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setFormVisivel(e.isIntersecting), { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const irParaInscricao = () => inscricaoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleInscrito = (i: InscricaoSalva) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(i));
    setInscricao(i);
    requestAnimationFrame(() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const novaInscricao = () => {
    localStorage.removeItem(STORAGE_KEY);
    setInscricao(null);
  };

  const preco = CURSO.valorPix ?? CURSO.valor;
  const msgDuvida = `Olá! Tenho uma dúvida sobre o Treinamento de Natal (${CURSO.titulo}).`;

  return (
    <div className="min-h-screen bg-curso-cream font-body text-curso-ink antialiased">
      {MODO_DEMO && (
        <div className="bg-red-600 px-4 py-2 text-center text-xs font-semibold text-white">
          MODO DE TESTE · as inscrições não são salvas · o QR Code Pix é real (chave CNPJ da G.A.)
        </div>
      )}
      {/* Banner com a marca */}
      <header className="relative bg-[#0c0c0c]">
        <Link to="/" aria-label="G.A. Auto Elétrica — página inicial" className="mx-auto block max-w-[875px]">
          <img
            src={banner}
            alt="G.A. Auto Elétrica"
            width={875}
            height={198}
            className="block h-auto w-full [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]"
          />
        </Link>
        <div className="h-1.5 bg-curso-yellow" />
      </header>

      <main>
        {/* Hero */}
        <section className="px-5 pb-10 pt-10 sm:px-8 lg:pb-16 lg:pt-16">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
            <div>
              <Pill>Treinamento de Natal</Pill>
              <h1 className="mt-6 font-display text-[2.6rem] font-black leading-[0.95] tracking-[-0.035em] sm:text-6xl lg:text-7xl">
                Autoelétrica básica
                <br />
                <span className="font-medium tracking-[-0.03em]">para </span>
                <span className="relative inline-block">
                  <span className="absolute inset-x-[-0.06em] bottom-[0.06em] top-[0.42em] -z-0 bg-curso-yellow" aria-hidden="true" />
                  <span className="relative">iniciantes.</span>
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-curso-ink/75 sm:text-xl">
                Aprenda o essencial da elétrica automotiva, <strong className="text-curso-ink">mesmo sem nenhuma noção.</strong>{" "}
                São {CURSO.cargaHoraria} horas de treinamento prático em dois dias.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={irParaInscricao}
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-curso-yellow px-7 py-4 font-display text-lg font-extrabold tracking-tight shadow-[0_6px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_0_0_#161616] active:translate-y-1 active:shadow-[0_2px_0_0_#161616]"
                >
                  Garantir minha vaga
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>
                <a
                  href={whatsappLink(msgDuvida)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-curso-ink px-6 py-4 font-semibold transition-colors hover:bg-curso-ink hover:text-white"
                >
                  <WhatsAppIcon className="h-5 w-5" />
                  Tirar dúvidas
                </a>
              </div>

              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-curso-ink/70">
                {CURSO.datas.map((d) => (
                  <li key={d.data} className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-curso-ink" />
                    {d.dia.split("-")[0]} {d.data}
                  </li>
                ))}
                {CURSO.vagas.limitadas && (
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-curso-ink" />
                    Vagas limitadas
                  </li>
                )}
              </ul>
            </div>

            {/* Brindes */}
            <aside className="rounded-3xl bg-curso-yellow p-7 shadow-[0_24px_48px_-24px_rgba(22,22,22,0.45)] sm:p-9">
              <p className="text-center text-xs font-extrabold uppercase tracking-[0.28em]">Cada participante ganha</p>
              <ul className="mt-5 divide-y divide-curso-ink/15 border-t border-curso-ink/15">
                {BRINDES.map(({ icon: Icon, titulo, sub }) => (
                  <li key={titulo} className="flex items-center gap-5 py-5">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-curso-ink text-curso-yellow">
                      <Icon className="h-7 w-7" />
                    </span>
                    <span>
                      <span className="block font-display text-2xl font-extrabold tracking-tight">{titulo}</span>
                      <span className="text-sm text-curso-ink/75">{sub}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </section>

        {/* Datas + local */}
        <section className="px-5 pb-12 sm:px-8 lg:pb-20">
          <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
            {CURSO.datas.map((d) => (
              <div key={d.data} className="flex items-center gap-5 rounded-2xl bg-white p-6 shadow-sm">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-curso-yellow">
                  <CalendarDays className="h-6 w-6" />
                </span>
                <div>
                  <Eyebrow>{d.dia}</Eyebrow>
                  <p className="font-display text-4xl font-black leading-none tracking-tight">{d.data}</p>
                  <p className="mt-1 text-curso-ink/70">{d.horario}</p>
                </div>
              </div>
            ))}
            <a
              href={CURSO.endereco.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-5 rounded-2xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-curso-yellow">
                <MapPin className="h-6 w-6" />
              </span>
              <div>
                <Eyebrow>Local</Eyebrow>
                <p className="font-semibold leading-snug">{CURSO.endereco.linha1}</p>
                <p className="text-sm text-curso-ink/70">Uberaba-MG · <span className="underline-offset-2 group-hover:underline">ver no mapa</span></p>
              </div>
            </a>
          </div>
        </section>

        {/* Conteúdo */}
        <section className="px-5 pb-14 sm:px-8 lg:pb-24">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-14">
            <div>
              <Eyebrow>O que você vai aprender</Eyebrow>
              <h2 className="mt-3 font-display text-4xl font-black leading-[1.02] tracking-[-0.03em] sm:text-5xl">
                Do básico da eletricidade ao diagnóstico.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-curso-ink/70">
                Conteúdo direto ao ponto, com a experiência de quem trabalha com elétrica automotiva todos os dias.
                Você sai entendendo como o sistema elétrico funciona e sabendo usar o multímetro para encontrar falhas.
              </p>
            </div>
            <ul className="rounded-3xl bg-white p-3 shadow-sm sm:p-5">
              {CONTEUDO.map((item, i) => (
                <li
                  key={item}
                  className="flex items-center gap-4 border-b border-curso-ink/[0.07] px-3 py-4 last:border-0 sm:px-4"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-curso-yellow">
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                  <span className="text-[17px] font-medium">{item}</span>
                  <span className="ml-auto font-mono text-xs text-curso-ink/30">{String(i + 1).padStart(2, "0")}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Inscrição */}
        <section
          id="inscricao"
          ref={inscricaoRef}
          className="scroll-mt-4 bg-curso-ink px-5 py-14 text-white sm:px-8 lg:py-24"
        >
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
            <div className="lg:pt-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-curso-yellow sm:text-xs">Inscrição</p>
              <h2 className="mt-3 font-display text-4xl font-black leading-[1.02] tracking-[-0.03em] sm:text-5xl">
                Garanta sua vaga em 3 passos.
              </h2>

              <ol className="mt-8 space-y-5">
                {PASSOS.map(({ icon: Icon, titulo, texto }, i) => (
                  <li key={titulo} className="flex gap-4">
                    <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-curso-yellow">
                      <Icon className="h-5 w-5" />
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-curso-yellow text-[11px] font-black text-curso-ink">
                        {i + 1}
                      </span>
                    </span>
                    <div>
                      <p className="font-semibold">{titulo}</p>
                      <p className="text-sm text-white/60">{texto}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-curso-yellow sm:text-xs">Valores e condições</p>
                {preco ? (
                  <>
                    <p className="mt-2 font-display text-4xl font-black tracking-tight text-curso-yellow">
                      {formatBRL(preco)}
                      {CURSO.valorPix && CURSO.valor && CURSO.valorPix < CURSO.valor ? (
                        <span className="ml-2 align-middle text-sm font-semibold text-white/70">no Pix</span>
                      ) : null}
                    </p>
                    {CURSO.valorPix && CURSO.valor && CURSO.valorPix < CURSO.valor ? (
                      <p className="text-sm text-white/70">ou {formatBRL(CURSO.valor)} no cartão {CURSO.condicoes}</p>
                    ) : CURSO.condicoes ? (
                      <p className="text-sm text-white/70">{CURSO.condicoes}</p>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="mt-2 font-display text-2xl font-extrabold tracking-tight">Chame a gente e confira!</p>
                    <a
                      href={whatsappLink("Olá! Quero saber os valores e formas de pagamento do Treinamento de Natal.")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block font-display text-3xl font-black tracking-tight text-curso-yellow hover:underline"
                    >
                      {CURSO.whatsapp.exibicao}
                    </a>
                    <p className="text-sm text-white/60">WhatsApp · valores e formas de pagamento</p>
                  </>
                )}
              </div>
            </div>

            <div ref={cardRef} className="scroll-mt-4 rounded-3xl bg-white p-6 text-curso-ink shadow-2xl sm:p-8">
              {inscricao ? (
                <Pagamento inscricao={inscricao} onNovaInscricao={novaInscricao} />
              ) : (
                <>
                  <h3 className="font-display text-2xl font-extrabold tracking-tight">Ficha de inscrição</h3>
                  <p className="mb-6 mt-1 text-sm text-curso-muted">
                    Treinamento de Natal · {CURSO.datas.map((d) => d.data).join(" e ")}
                  </p>
                  <InscricaoForm onInscrito={handleInscrito} />
                </>
              )}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-5 py-14 sm:px-8 lg:py-24">
          <div className="mx-auto max-w-3xl">
            <Eyebrow className="text-center">Dúvidas frequentes</Eyebrow>
            <h2 className="mt-3 text-center font-display text-4xl font-black tracking-[-0.03em] sm:text-5xl">
              Antes de se inscrever
            </h2>
            <Accordion type="single" collapsible className="mt-10 rounded-3xl bg-white px-5 shadow-sm sm:px-8">
              {FAQ.map(({ p, r }, i) => (
                <AccordionItem key={p} value={`q${i}`} className="border-curso-ink/[0.08] last:border-0">
                  <AccordionTrigger className="py-5 text-left text-[17px] font-semibold hover:no-underline">{p}</AccordionTrigger>
                  <AccordionContent className="pb-5 text-base leading-relaxed text-curso-ink/70">{r}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Chamada final */}
        <section className="px-5 pb-16 sm:px-8 lg:pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-display text-3xl font-medium leading-tight tracking-tight sm:text-4xl">
              Garanta sua vaga e venha aprender
              <br />
              com a <strong className="font-black">G.A. Autoelétrica!</strong>
            </p>
            <button
              type="button"
              onClick={irParaInscricao}
              className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-curso-yellow px-8 py-4 font-display text-lg font-extrabold tracking-tight shadow-[0_6px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_0_0_#161616] active:translate-y-1 active:shadow-[0_2px_0_0_#161616]"
            >
              Quero me inscrever
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
            <a
              href={CURSO.endereco.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mx-auto mt-12 flex max-w-xl items-center gap-4 rounded-2xl bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-curso-yellow">
                <MapPin className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-bold">{CURSO.endereco.linha1}</span>
                <span className="text-sm text-curso-ink/65">{CURSO.endereco.linha2}</span>
              </span>
            </a>
          </div>
        </section>
      </main>

      <footer>
        <div
          className="h-4 w-full"
          style={{ background: "repeating-linear-gradient(-45deg,#FFC61A 0 18px,#161616 18px 36px)" }}
        />
        <div className="bg-curso-ink px-5 pb-24 pt-6 text-center text-sm text-white/60 lg:pb-6">
          © {new Date().getFullYear()} G.A. Auto Elétrica · Uberaba-MG ·{" "}
          <Link to="/" className="text-white/80 underline-offset-4 hover:underline">
            Conheça a oficina
          </Link>
        </div>
      </footer>

      {/* CTA fixo no celular */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-curso-ink/10 bg-curso-cream/95 p-3 backdrop-blur transition-transform duration-300 lg:hidden ${
          formVisivel ? "translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="flex gap-2">
          <button
            type="button"
            onClick={irParaInscricao}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-curso-yellow py-3.5 font-display font-extrabold tracking-tight shadow-[0_4px_0_0_#161616]"
          >
            {inscricao ? "Ver pagamento" : "Garantir minha vaga"}
            <ArrowRight className="h-4 w-4" />
          </button>
          <a
            href={whatsappLink(msgDuvida)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Falar no WhatsApp"
            className="flex w-14 items-center justify-center rounded-xl bg-[#25D366] text-white"
          >
            <WhatsAppIcon className="h-6 w-6" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default CursoNatal;
