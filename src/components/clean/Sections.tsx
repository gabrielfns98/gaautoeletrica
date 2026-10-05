import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { services, steps, stats, plans, testimonials, faq, brand, waLink } from "./content";
import { useCountUp, useInView } from "./hooks";
import { Fade, Mask } from "./fx";

/* ------------------------------------------------------------- SERVIÇOS */
export function Services() {
  return (
    <section id="servicos" className="hc-section">
      <div className="hc-shell">
        <div className="hc-head">
          <span className="hc-head__label hc-label">Serviços</span>
          <h2 className="hc-head__title hc-title">
            <Mask><span>Um serviço para cada bagunça</span></Mask>
          </h2>
          <p className="hc-head__text hc-body">
            Da manutenção semanal ao pós-obra que ninguém quer encarar. Cada um tem
            protocolo e tempo próprios, combinados antes.
          </p>
        </div>

        <div className="hc-list" style={{ marginTop: "clamp(2.5rem, 5vw, 4rem)" }}>
          {services.map((service, i) => (
            <Fade key={service.title} delay={i * 60}>
              <article className="hc-row">
                <span className="hc-row__n">{String(i + 1).padStart(2, "0")}</span>
                <h3>{service.title}</h3>
                <div className="hc-row__text">
                  <p className="hc-body">{service.text}</p>
                  <p className="hc-row__items">{service.items.join(" · ")}</p>
                </div>
                <div className="hc-row__price">
                  <span>{service.price.startsWith("a partir de") ? "A partir de" : "Valor"}</span>
                  {service.price.replace("a partir de ", "")}
                </div>
              </article>
            </Fade>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------- PROCESSO + NÚMEROS */
function Stat({ value, suffix, decimals, label }: { value: number; suffix?: string; decimals?: number; label: string }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.35);
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
    <section className="hc-section hc-section--dark">
      <div className="hc-shell">
        <div className="hc-head">
          <span className="hc-head__label hc-label">Como funciona</span>
          <h2 className="hc-head__title hc-title" style={{ color: "var(--paper)" }}>
            <Mask><span>Quatro passos e pronto</span></Mask>
          </h2>
          <p className="hc-head__text hc-body">
            Sem visita técnica, sem enrolação e sem surpresa no valor final.
          </p>
        </div>

        <div className="hc-steps" style={{ marginTop: "clamp(2.5rem, 5vw, 4rem)" }}>
          {steps.map((step, i) => (
            <Fade key={step.n} delay={i * 90} className="hc-step">
              <span className="hc-step__n">{step.n}</span>
              <h3>{step.title}</h3>
              <p className="hc-body">{step.text}</p>
            </Fade>
          ))}
        </div>

        <div className="hc-stats">
          {stats.map((stat) => <Stat key={stat.label} {...stat} />)}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- PLANOS */
export function Plans() {
  return (
    <section id="planos" className="hc-section hc-section--paper2">
      <div className="hc-shell">
        <div className="hc-head">
          <span className="hc-head__label hc-label">Planos</span>
          <h2 className="hc-head__title hc-title">
            <Mask><span>Preço fechado, combinado antes</span></Mask>
          </h2>
          <p className="hc-head__text hc-body">
            Valores de referência para apartamento padrão. O orçamento final sai em
            minutos, por escrito, depois que você conta a metragem.
          </p>
        </div>

        <div className="hc-plans" style={{ marginTop: "clamp(2.5rem, 5vw, 4rem)" }}>
          {plans.map((plan, i) => (
            <Fade key={plan.name} delay={i * 90} className={`hc-plan${plan.featured ? " hc-plan--featured" : ""}`}>
              <div>
                <span className="hc-label">{plan.flag ?? `0${i + 1}`}</span>
                <h3 className="hc-plan__name" style={{ marginTop: "0.6rem" }}>{plan.name}</h3>
                <p className="hc-body" style={{ marginTop: "0.4rem" }}>{plan.note}</p>
              </div>

              <div className="hc-plan__price">
                {plan.price === "sob medida"
                  ? <>Sob medida</>
                  : <>R$ {plan.price}<small>{plan.unit}</small></>}
              </div>

              <ul>
                {plan.items.map((item) => <li key={item}>{item}</li>)}
              </ul>

              <a
                className="hc-btn hc-btn--line"
                href={waLink(`Oi, ${brand.name}! Tenho interesse no plano ${plan.name}.`)}
                target="_blank"
                rel="noreferrer"
              >
                {plan.cta} <ArrowUpRight size={14} />
              </a>
            </Fade>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- DEPOIMENTOS */
export function Testimonials() {
  return (
    <section className="hc-section">
      <div className="hc-shell">
        <div className="hc-head">
          <span className="hc-head__label hc-label">Quem já contratou</span>
          <h2 className="hc-head__title hc-title">
            <Mask><span>A prova real é a porta abrindo</span></Mask>
          </h2>
        </div>

        <div className="hc-quotes" style={{ marginTop: "clamp(2.5rem, 5vw, 4rem)" }}>
          {testimonials.map((item, i) => (
            <Fade key={item.name} delay={i * 90} className="hc-quote">
              <figure style={{ margin: 0, display: "grid", gap: "1.6rem" }}>
                <blockquote>“{item.text}”</blockquote>
                <figcaption>
                  <b>{item.name}</b>
                  <span className="hc-label" style={{ marginTop: "0.35rem" }}>{item.role}</span>
                </figcaption>
              </figure>
            </Fade>
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
    <section id="duvidas" className="hc-section hc-section--paper2">
      <div className="hc-shell">
        <div className="hc-head">
          <span className="hc-head__label hc-label">Dúvidas</span>
          <h2 className="hc-head__title hc-title">
            <Mask><span>O que todo mundo pergunta antes</span></Mask>
          </h2>
          <p className="hc-head__text hc-body">
            Ficou outra?{" "}
            <a
              href={waLink(`Oi, ${brand.name}! Tenho uma dúvida sobre o serviço.`)}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--ink)", textUnderlineOffset: "4px" }}
            >
              Chama no WhatsApp.
            </a>
          </p>
        </div>

        <div className="hc-faq" style={{ marginTop: "clamp(2.5rem, 5vw, 4rem)" }}>
          {faq.map((item, i) => (
            <div key={item.q} className={`hc-faq__item${open === i ? " is-open" : ""}`}>
              <button
                type="button"
                className="hc-faq__btn"
                aria-expanded={open === i}
                onClick={() => setOpen(open === i ? null : i)}
              >
                {item.q}
                <span className="hc-faq__sign" aria-hidden="true" />
              </button>
              <div className="hc-faq__panel">
                <div><p className="hc-body">{item.a}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
