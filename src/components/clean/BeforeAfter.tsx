import { useEffect, useRef } from "react";
import { Sparkles, ShieldCheck, BadgeCheck, Droplets } from "lucide-react";
import { wipe } from "./content";
import { Reveal } from "./fx";
import { useReducedMotion } from "./hooks";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

const SUDS = Array.from({ length: 14 }, (_, i) => {
  const s = ((i * 7919) % 97) / 97;
  return { top: 4 + s * 90, size: 6 + s * 20, left: 8 + ((i * 31) % 70), dur: 3 + s * 3, delay: -s * 4 };
});
const DROPS = Array.from({ length: 7 }, (_, i) => {
  const s = ((i * 5003) % 83) / 83;
  return { top: 8 + s * 78, left: 30 + ((i * 17) % 44), dur: 2.4 + s * 2, delay: -s * 3 };
});

const ICONS = [BadgeCheck, ShieldCheck, Sparkles];

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
      const from = vh * 0.88;
      const to = vh * 0.12;
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
    <section id="resultado" className="hc-section hc-section--foam">
      <div className="hc-shell">
        <Reveal>
          <div className="hc-head hc-head--center">
            <span className="hc-eyebrow"><Droplets size={14} /> {wipe.badge}</span>
            <h2 className="hc-title">{wipe.title}</h2>
            <p className="hc-lede">{wipe.text}</p>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="hc-mt">
            <div ref={wipeRef} className="hc-wipe" role="img" aria-label="Comparação do mesmo cômodo antes e depois da limpeza profunda">
              <div className="hc-wipe__layer">
                <img src={wipe.before} alt="" aria-hidden="true" loading="lazy" />
              </div>
              <div className="hc-wipe__layer hc-wipe__layer--after">
                <img src={wipe.after} alt="" aria-hidden="true" loading="lazy" />
              </div>

              <span className="hc-wipe__tag hc-wipe__tag--before">Antes</span>
              <span className="hc-wipe__tag hc-wipe__tag--after">Depois</span>

              <div className="hc-wipe__suds" aria-hidden="true">
                {SUDS.map((s, i) => (
                  <i key={i} style={{ top: `${s.top}%`, left: `${s.left}%`, width: s.size, height: s.size, ["--dur" as string]: `${s.dur}s`, ["--delay" as string]: `${s.delay}s` }} />
                ))}
                <span className="hc-wipe__drops">
                  {DROPS.map((d, i) => (
                    <i key={i} style={{ top: `${d.top}%`, left: `${d.left}%`, ["--dur" as string]: `${d.dur}s`, ["--delay" as string]: `${d.delay}s` }} />
                  ))}
                </span>
              </div>

              <span className="hc-wipe__edge" aria-hidden="true" />
              <span className="hc-wipe__squeegee" aria-hidden="true">
                <Sparkles size={20} />
              </span>
            </div>
          </div>
        </Reveal>

        <div className="hc-grid hc-grid--3 hc-mt">
          {wipe.points.map((point, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <Reveal key={point.title} delay={i * 110}>
                <article className="hc-card">
                  <span className="hc-ico"><Icon size={22} /></span>
                  <h3 style={{ fontSize: "1.14rem", marginTop: "1rem" }}>{point.title}</h3>
                  <p style={{ marginTop: "0.55rem", color: "var(--hc-muted)", fontSize: "0.95rem", lineHeight: 1.62 }}>
                    {point.text}
                  </p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
