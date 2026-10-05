import { useState } from "react";
import {
  Sparkles, Hammer, Sofa, AppWindow, Building2, KeyRound,
  CheckCircle2, Star, Plus, MessageCircle, Route,
} from "lucide-react";
import { services, steps, stats, plans, testimonials, faq, brand, waLink } from "./content";
import { BubbleField, Reveal } from "./fx";
import { useCountUp, useInView } from "./hooks";

const SERVICE_ICONS: Record<string, typeof Sparkles> = {
  sparkles: Sparkles, hammer: Hammer, sofa: Sofa,
  glass: AppWindow, building: Building2, key: KeyRound,
};

/* ------------------------------------------------------------- SERVIÇOS */
export function Services() {
  return (
    <section id="servicos" className="hc-section hc-section--light">
      <div className="hc-shell">
        <Reveal>
          <div className="hc-head">
            <span className="hc-eyebrow"><Sparkles size={14} /> O que fazemos</span>
            <h2 className="hc-title">Um serviço para cada bagunça</h2>
            <p className="hc-lede">
              Da manutenção semanal ao pós-obra que ninguém quer encarar. Escolha o que precisa
              hoje — a gente adapta o protocolo ao seu imóvel.
            </p>
          </div>
        </Reveal>

        <div className="hc-grid hc-grid--3 hc-mt">
          {services.map((service, i) => {
            const Icon = SERVICE_ICONS[service.icon] ?? Sparkles;
            return (
              <Reveal key={service.title} delay={(i % 3) * 110}>
                <article className="hc-card hc-service">
                  <span className="hc-ico"><Icon size={23} /></span>
                  <h3>{service.title}</h3>
                  <p>{service.text}</p>
                  <ul>
                    {service.items.map((item) => (
                      <li key={item}><CheckCircle2 size={16} /> {item}</li>
                    ))}
                  </ul>
                  <div className="hc-service__price">
                    <b>{service.price}</b>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------- PROCESSO + NÚMEROS */
function Stat({ value, suffix, decimals, label }: { value: number; suffix?: string; decimals?: number; label: string }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  const current = useCountUp(value, inView, decimals ?? 0);
  const shown = (decimals ?? 0) > 0
    ? current.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : Math.round(current).toLocaleString("pt-BR");
  return (
    <div className="hc-stat" ref={ref}>
      <b>{shown}{suffix ?? ""}</b>
      <span>{label}</span>
    </div>
  );
}

export function Process() {
  return (
    <section className="hc-section hc-section--dark" style={{ position: "relative", overflow: "hidden" }}>
      <BubbleField count={12} seed={23} tone="ink" peak={0.35} />
      <div className="hc-shell" style={{ position: "relative", zIndex: 2 }}>
        <Reveal>
          <div className="hc-head">
            <span className="hc-eyebrow"><Route size={14} /> Como funciona</span>
            <h2 className="hc-title" style={{ color: "#f4fdff" }}>Quatro passos e pronto</h2>
            <p className="hc-lede">Sem visita técnica, sem enrolação e sem surpresa no valor final.</p>
          </div>
        </Reveal>

        <div className="hc-steps hc-mt">
          {steps.map((step, i) => (
            <Reveal key={step.n} delay={i * 130}>
              <div className="hc-step">
                <span className="hc-step__n">{step.n}</span>
                {i < steps.length - 1 && (
                  <span className="hc-step__line" aria-hidden="true"><i style={{ ["--d" as string]: `${i * 130 + 260}ms` }} /></span>
                )}
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="hc-stats hc-mt">
          {stats.map((stat) => <Stat key={stat.label} {...stat} />)}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- PLANOS */
export function Plans() {
  return (
    <section id="planos" className="hc-section hc-section--light">
      <div className="hc-shell">
        <Reveal>
          <div className="hc-head hc-head--center">
            <span className="hc-eyebrow">Planos</span>
            <h2 className="hc-title">Preço fechado, combinado antes</h2>
            <p className="hc-lede">
              Valores de referência para apartamento padrão. O orçamento final sai em minutos,
              por escrito, depois que você conta a metragem.
            </p>
          </div>
        </Reveal>

        <div className="hc-grid hc-grid--3 hc-mt">
          {plans.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 120}>
              <article className={`hc-card hc-plan${plan.featured ? " hc-plan--featured" : ""}`}>
                {plan.flag && <span className="hc-plan__flag">{plan.flag}</span>}
                <div className="hc-plan__top">
                  <span className="hc-plan__name">{plan.name}</span>
                  <span className="hc-plan__note">{plan.note}</span>
                </div>
                <div className="hc-plan__price">
                  {plan.price === "sob medida"
                    ? <b style={{ fontSize: "1.9rem" }}>Sob medida</b>
                    : <><span>R$</span><b>{plan.price}</b><span>{plan.unit}</span></>}
                </div>
                <ul>
                  {plan.items.map((item) => (
                    <li key={item}><CheckCircle2 size={17} /> {item}</li>
                  ))}
                </ul>
                <a
                  className={`hc-btn ${plan.featured ? "hc-btn--primary" : "hc-btn--outline"}`}
                  style={{ marginTop: "0.4rem" }}
                  href={waLink(`Oi, ${brand.name}! Tenho interesse no plano ${plan.name}.`)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {plan.cta}
                </a>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- DEPOIMENTOS */
const AV_BG = [
  "linear-gradient(140deg,#5eead4,#19c6da)",
  "linear-gradient(140deg,#c7e86f,#5eead4)",
  "linear-gradient(140deg,#19c6da,#067d96)",
];

export function Testimonials() {
  return (
    <section className="hc-section hc-section--foam">
      <div className="hc-shell">
        <Reveal>
          <div className="hc-head hc-head--center">
            <span className="hc-eyebrow"><Star size={14} /> Quem já contratou</span>
            <h2 className="hc-title">A prova real é a porta abrindo</h2>
          </div>
        </Reveal>

        <div className="hc-grid hc-grid--3 hc-mt">
          {testimonials.map((item, i) => (
            <Reveal key={item.name} delay={i * 120}>
              <article className="hc-card hc-quote">
                <div className="hc-quote__stars">
                  {Array.from({ length: 5 }, (_, s) => <Star key={s} size={17} fill="currentColor" />)}
                </div>
                <p>“{item.text}”</p>
                <div className="hc-quote__who">
                  <span className="hc-quote__av" style={{ background: AV_BG[i % AV_BG.length] }}>
                    {item.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </span>
                  <span>
                    <b>{item.name}</b>
                    <span>{item.role}</span>
                  </span>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- FAQ */
export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="duvidas" className="hc-section hc-section--light">
      <div className="hc-shell">
        <Reveal>
          <div className="hc-head hc-head--center">
            <span className="hc-eyebrow">Dúvidas frequentes</span>
            <h2 className="hc-title">O que todo mundo pergunta antes</h2>
          </div>
        </Reveal>

        <div className="hc-faq hc-mt">
          {faq.map((item, i) => (
            <Reveal key={item.q} delay={i * 70}>
              <div className={`hc-faq__item${open === i ? " is-open" : ""}`}>
                <button
                  type="button"
                  className="hc-faq__btn"
                  aria-expanded={open === i}
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  {item.q}
                  <span className="hc-faq__sign" aria-hidden="true"><Plus size={17} /></span>
                </button>
                <div className="hc-faq__panel">
                  <div><p>{item.a}</p></div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={200}>
          <p style={{ textAlign: "center", marginTop: "2.5rem", color: "var(--hc-muted)" }}>
            Ficou outra dúvida?{" "}
            <a
              href={waLink(`Oi, ${brand.name}! Tenho uma dúvida sobre o serviço.`)}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--hc-brand-3)", fontWeight: 600 }}
            >
              <MessageCircle size={15} style={{ display: "inline", verticalAlign: "-2px" }} /> Chama no WhatsApp
            </a>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
