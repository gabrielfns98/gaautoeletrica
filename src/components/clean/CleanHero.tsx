import { ArrowDown, ArrowUpRight } from "lucide-react";
import heroImg from "@/assets/clean/sala.svg";
import { brand, hero, waLink } from "./content";
import { Mask, Swipe } from "./fx";

export default function CleanHero() {
  return (
    <section className="hc-hero" id="topo">
      <div className="hc-shell">
        <div className="hc-hero__center">
          <Mask><span className="hc-over">{hero.over}</span></Mask>
          <h1 className="hc-display">
            <Mask delay={130}><span>{hero.title}</span></Mask>
          </h1>
          <Mask delay={240}><p className="hc-lede">{hero.lede}</p></Mask>

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
        </div>

        <div className="hc-hero__shot hc-bloom">
          <Swipe delay={180}>
            <img src={heroImg} alt="Sala de estar depois da limpeza profunda da equipe House Clean" />
          </Swipe>
          <div className="hc-hero__cap">
            <span className="hc-label">{hero.caption[0]}</span>
            <span className="hc-label">{hero.caption[1]}</span>
          </div>
        </div>

        <div className="hc-hero__facts">
          {hero.facts.map((fact) => (
            <div className="hc-hero__fact" key={fact.label}>
              <b>{fact.value}</b>
              <span>{fact.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
