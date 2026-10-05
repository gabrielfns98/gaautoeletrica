import type { CSSProperties } from "react";
import { MessageCircle, ArrowDown, ShieldCheck, Leaf, Star } from "lucide-react";
import heroImg from "@/assets/clean/sala.svg";
import { brand, hero, waLink } from "./content";
import { BubbleField, SparkleBurst } from "./fx";

const AVATARS = [
  { initials: "MA", bg: "linear-gradient(140deg,#5eead4,#19c6da)" },
  { initials: "RT", bg: "linear-gradient(140deg,#c7e86f,#5eead4)" },
  { initials: "CM", bg: "linear-gradient(140deg,#19c6da,#067d96)" },
  { initials: "+9", bg: "linear-gradient(140deg,#e6f7fa,#b9e6ef)" },
];

const CHIP_POS: CSSProperties[] = [
  { top: "9%", left: "-9%" },
  { bottom: "16%", right: "-7%" },
  { bottom: "-3%", left: "6%" },
];

export default function CleanHero() {
  return (
    <section className="hc-hero" id="topo">
      <div className="hc-hero__aurora" aria-hidden="true">
        <span className="hc-hero__blob" style={{ width: "46vw", height: "46vw", top: "-6%", right: "-8%", background: "radial-gradient(circle,#0f8fa8,transparent 68%)" }} />
        <span className="hc-hero__blob" style={{ width: "38vw", height: "38vw", bottom: "-14%", left: "-10%", background: "radial-gradient(circle,#10707f,transparent 70%)", animationDelay: "-6s" }} />
        <span className="hc-hero__blob" style={{ width: "26vw", height: "26vw", top: "28%", left: "36%", background: "radial-gradient(circle,#2fa07a,transparent 72%)", animationDelay: "-11s", opacity: 0.32 }} />
      </div>
      <BubbleField count={20} seed={5} tone="ink" peak={0.5} />

      <div className="hc-shell hc-hero__grid">
        <div className="hc-hero__copy">
          <span className="hc-eyebrow">
            <span style={{ width: 7, height: 7, borderRadius: 99, background: "#c7e86f", boxShadow: "0 0 10px #c7e86f" }} />
            {hero.badge}
          </span>

          <h1 className="hc-title hc-title--xl">
            {hero.title.lead}{" "}
            <span className="hc-grad">{hero.title.accent}</span>
          </h1>

          <p className="hc-lede hc-hero__lede">{hero.lede}</p>

          <div className="hc-hero__cta">
            <a
              className="hc-btn hc-btn--primary hc-btn--lg"
              href={waLink(`Oi, ${brand.name}! Vi o site e quero um orçamento de limpeza.`)}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={19} /> {hero.primary}
            </a>
            <a className="hc-btn hc-btn--ghost hc-btn--lg" href="#ambientes">
              <ArrowDown size={18} /> {hero.secondary}
            </a>
          </div>

          <div className="hc-hero__trust">
            <div className="hc-hero__trustItem">
              <span className="hc-hero__avatars">
                {AVATARS.map((a) => (
                  <span key={a.initials} style={{ background: a.bg }}>{a.initials}</span>
                ))}
              </span>
              <span>
                <b style={{ color: "#f4fdff" }}>+300 famílias</b> atendidas por mês
              </span>
            </div>
            <div className="hc-hero__trustItem"><ShieldCheck size={18} color="#5eead4" /> Equipe verificada e segurada</div>
            <div className="hc-hero__trustItem"><Leaf size={18} color="#c7e86f" /> Produtos biodegradáveis</div>
          </div>
        </div>

        <div className="hc-hero__art">
          <SparkleBurst
            points={[
              { top: "-4%", left: "12%", delay: 0.2, scale: 1.4 },
              { top: "38%", left: "-7%", delay: 1.1 },
              { top: "72%", left: "96%", delay: 0.6, scale: 1.2 },
              { top: "6%", left: "88%", delay: 1.8, scale: 0.9 },
            ]}
            size={22}
          />
          <div className="hc-hero__frame">
            <img src={heroImg} alt="Sala de estar higienizada pela equipe House Clean" />
            <span className="hc-hero__shine" aria-hidden="true" />
          </div>

          {hero.chips.map((chip, i) => (
            <div
              key={chip.title}
              className={`hc-chip hc-chip--${i + 1}`}
              style={{ ...CHIP_POS[i], ["--dur" as string]: `${5.5 + i}s`, ["--delay" as string]: `${i * 0.7}s` }}
            >
              {i === 1 && <Star size={16} fill="#f5b946" color="#f5b946" />}
              <span>
                {chip.title}
                <small>{chip.note}</small>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
