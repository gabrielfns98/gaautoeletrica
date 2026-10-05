import { useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import fogImg from "@/assets/clean/sala.svg";
import { brand, hero, signoff, waLink } from "./content";
import { useReducedMotion } from "./hooks";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

const DRIPS = Array.from({ length: 9 }, (_, i) => {
  const r = ((i * 7919) % 101) / 101;
  return { left: 6 + r * 84, top: 8 + r * 44, height: 8 + r * 20, op: 0.3 + r * 0.45 };
});

/**
 * Fecho do filme: a tela está embaçada como um vidro sujo e o rodo passa,
 * revelando a marca. É o gesto de house cleaning virando assinatura.
 */
export default function Finale() {
  const reduced = useReducedMotion();
  const wrapRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const fogRef = useRef<HTMLDivElement>(null);
  const bladeRef = useRef<HTMLSpanElement>(null);
  const dripsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fog = fogRef.current;
    if (!fog) return;
    if (reduced) {
      fog.style.clipPath = "inset(0 0 0 100%)";
      if (bladeRef.current) bladeRef.current.style.opacity = "0";
      if (dripsRef.current) dripsRef.current.style.opacity = "0";
      return;
    }
    let frame = 0;

    const render = () => {
      frame = 0;
      const wrap = wrapRef.current;
      const sticky = stickyRef.current;
      if (!wrap || !sticky || !fogRef.current) return;

      const rect = wrap.getBoundingClientRect();
      const span = rect.height - (sticky.clientHeight || window.innerHeight);
      const p = span > 0 ? clamp01(-rect.top / span) : 0;
      // a passada acontece no miolo da seção, com folga antes e depois
      const w = clamp01((p - 0.1) / 0.72) * 100;

      fogRef.current.style.clipPath = `inset(0 0 0 ${w.toFixed(2)}%)`;
      const edge = w > 0.5 && w < 99.5 ? 1 : 0;
      if (bladeRef.current) {
        bladeRef.current.style.left = `${w.toFixed(2)}%`;
        bladeRef.current.style.opacity = String(edge);
      }
      if (dripsRef.current) {
        dripsRef.current.style.left = `${w.toFixed(2)}%`;
        dripsRef.current.style.opacity = String(edge * 0.9);
      }
    };

    const schedule = () => { if (!frame) frame = requestAnimationFrame(render); };
    render();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [reduced]);

  return (
    <section
      ref={wrapRef}
      className="hc-reveal-scene"
      style={{ height: reduced ? undefined : "165svh" }}
      aria-label="Encerramento"
    >
      <div ref={stickyRef} className="hc-reveal-scene__sticky">
       <div className="hc-reveal-scene__frame">
        <div className="hc-reveal-scene__clean">
          <div>
            <div className="hc-reveal-scene__word">{signoff.word}</div>
            <div className="hc-reveal-scene__sub">{signoff.sub}</div>
            <p className="hc-reveal-scene__tag">{signoff.tagline}</p>
            <div className="hc-reveal-scene__cta">
              <a
                className="hc-btn hc-btn--solid"
                href={waLink(`Oi, ${brand.name}! Vi o site e quero um orçamento de limpeza.`)}
                target="_blank"
                rel="noreferrer"
              >
                {hero.primary} <ArrowUpRight size={15} />
              </a>
              <a className="hc-btn hc-btn--line" href="#servicos">Ver serviços</a>
            </div>
          </div>
        </div>

        {/* o vidro sujo que o rodo tira */}
        <div className="hc-fog" ref={fogRef} aria-hidden="true">
          <img src={fogImg} alt="" />
          <span className="hc-fog__haze" />
          <span className="hc-fog__grain" />
        </div>

        <div className="hc-fog__drips" ref={dripsRef} aria-hidden="true">
          {DRIPS.map((d, i) => (
            <i key={i} style={{ left: `${d.left}%`, top: `${d.top}%`, height: `${d.height}%`, opacity: d.op }} />
          ))}
        </div>
        <span className="hc-fog__blade" ref={bladeRef} aria-hidden="true" />

       </div>
      </div>
    </section>
  );
}
