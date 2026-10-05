import { ArrowDown, ArrowUpRight } from "lucide-react";
import heroImg from "@/assets/clean/sala.svg";
import { brand, hero, waLink } from "./content";
import { Mask, Swipe } from "./fx";

export default function CleanHero() {
  return (
    <section className="hc-hero" id="topo">
      <div className="hc-shell">
        <div className="hc-hero__grid">
          <span className="hc-hero__label">
            <Mask><span className="hc-label">{hero.label}</span></Mask>
          </span>
          <h1 className="hc-display">
            {hero.title.map((line, i) => (
              <Mask key={line.text} delay={i * 110}>
                {line.italic ? <em>{line.text}</em> : <span>{line.text}</span>}
              </Mask>
            ))}
          </h1>
        </div>

        <div className="hc-hero__meta">
          <p className="hc-lede">{hero.lede}</p>

          <div className="hc-hero__cta">
            <a
              className="hc-btn hc-btn--solid"
              href={waLink(`Oi, ${brand.name}! Vi o site e quero um orçamento de limpeza.`)}
              target="_blank"
              rel="noreferrer"
            >
              {hero.primary} <ArrowUpRight size={15} />
            </a>
            <a className="hc-link" href="#ambientes">
              {hero.secondary} <ArrowDown size={14} />
            </a>
          </div>

          <div className="hc-hero__facts">
            {hero.facts.map((fact) => (
              <div className="hc-hero__fact" key={fact.label}>
                <span>{fact.label}</span>
                <b>{fact.value}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="hc-hero__shot">
          <Swipe delay={160}>
            <img src={heroImg} alt="Sala de estar depois da limpeza profunda da equipe House Clean" />
          </Swipe>
          <div className="hc-hero__cap">
            <span className="hc-label">{hero.caption[0]}</span>
            <span className="hc-label">{hero.caption[1]}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
