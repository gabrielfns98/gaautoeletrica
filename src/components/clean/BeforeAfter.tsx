import { useEffect, useRef } from "react";
import { MoveHorizontal } from "lucide-react";
import { wipe } from "./content";
import { useReducedMotion } from "./hooks";
import { Fade, Mask } from "./fx";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export default function BeforeAfter() {
  const reduced = useReducedMotion();
  const wipeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wipeRef.current;
    if (!el) return;
    if (reduced) {
      el.style.setProperty("--w", "50%");
      return;
    }
    let frame = 0;

    const render = () => {
      frame = 0;
      const node = wipeRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const from = vh * 0.9;
      const to = vh * 0.1;
      const prog = clamp01((from - rect.top) / (from - to));
      node.style.setProperty("--w", `${(3 + prog * 94).toFixed(2)}%`);
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
    <section id="resultado" className="hc-section hc-section--paper2">
      <div className="hc-shell">
        <div className="hc-head">
          <span className="hc-head__label hc-label">{wipe.badge}</span>
          <h2 className="hc-head__title hc-title">
            <Mask><span>{wipe.title}</span></Mask>
          </h2>
          <p className="hc-head__text hc-body">{wipe.text}</p>
        </div>

        <Fade delay={120}>
          <div style={{ marginTop: "clamp(2.5rem, 5vw, 4rem)" }}>
            <div
              ref={wipeRef}
              className="hc-wipe"
              role="img"
              aria-label="Comparação do mesmo cômodo antes e depois da limpeza profunda"
            >
              <div className="hc-wipe__layer">
                <img src={wipe.before} alt="" aria-hidden="true" loading="lazy" />
              </div>
              <div className="hc-wipe__layer hc-wipe__layer--after">
                <img src={wipe.after} alt="" aria-hidden="true" loading="lazy" />
              </div>
              <span className="hc-wipe__tag hc-wipe__tag--after">Depois</span>
              <span className="hc-wipe__tag hc-wipe__tag--before">Antes</span>
              <span className="hc-wipe__edge" aria-hidden="true" />
              <span className="hc-wipe__knob" aria-hidden="true"><MoveHorizontal size={16} /></span>
            </div>
            <div className="hc-wipe__cap">
              <span className="hc-label">Mesmo cômodo, mesmo ângulo</span>
              <span className="hc-label">Protocolo completo · 4h</span>
            </div>
          </div>
        </Fade>

        <div className="hc-list" style={{ marginTop: "clamp(3rem, 6vw, 5rem)" }}>
          {wipe.points.map((point, i) => (
            <Fade key={point.title} delay={i * 90}>
              <article className="hc-row" style={{ gridTemplateColumns: "3.5rem minmax(0,0.95fr) minmax(0,1.15fr)" }}>
                <span className="hc-row__n">{String(i + 1).padStart(2, "0")}</span>
                <h3>{point.title}</h3>
                <p className="hc-body hc-row__text">{point.text}</p>
              </article>
            </Fade>
          ))}
        </div>
      </div>
    </section>
  );
}
