import { ArrowDown, ArrowUpRight } from "lucide-react";
import heroImg from "@/assets/clean/sala.svg";
import { brand, hero, waLink } from "./content";
import { Mask } from "./fx";

export default function CleanHero() {
  return (
    <section className="hc-hero" id="topo">
      <div className="hc-hero__bg" aria-hidden="true">
        <img src={heroImg} alt="" />
      </div>

      <div className="hc-shell">
        <div className="hc-hero__inner">
          <Mask><span className="hc-label">{hero.label}</span></Mask>
          <h1>
            <Mask delay={110}><span>{hero.over}</span></Mask>
            <Mask delay={200}><span>{hero.title}</span></Mask>
          </h1>
          <Mask delay={300}><p className="hc-lede">{hero.lede}</p></Mask>

          <div className="hc-hero__cta">
            <a
              className="hc-btn hc-btn--solid"
              href={waLink(`Oi, ${brand.name}! Vi o site e quero um orçamento de limpeza.`)}
              target="_blank"
              rel="noreferrer"
            >
              {hero.primary} <ArrowUpRight size={15} />
            </a>
            <a className="hc-btn hc-btn--line" href="#ambientes">
              {hero.secondary} <ArrowDown size={15} />
            </a>
          </div>

          <div className="hc-hero__trust">
            {hero.facts.map((fact) => (
              <span key={fact.label}><b>{fact.value}</b> {fact.label.toLowerCase()}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="hc-hero__scroll" aria-hidden="true">
        <i />
        Role pela casa
      </div>
    </section>
  );
}
