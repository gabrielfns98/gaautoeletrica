import { useEffect, useRef, useState, type CSSProperties } from "react";
import { rooms } from "./content";
import { useReducedMotion } from "./hooks";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * A home é o primeiro cômodo, em tela cheia. Cada rolagem traz o próximo
 * cômodo de baixo para cima enquanto o anterior sobe mais devagar — a
 * sensação é de descer pela casa, não de trocar de slide.
 */
export default function FilmRooms() {
  const reduced = useReducedMotion();
  const wrapRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const shadeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    let last = -1;

    const render = () => {
      frame = 0;
      const wrap = wrapRef.current;
      const sticky = stickyRef.current;
      if (!wrap || !sticky) return;

      const rect = wrap.getBoundingClientRect();
      const vh = sticky.clientHeight || window.innerHeight;
      const span = rect.height - vh;
      const p = span > 0 ? clamp01(-rect.top / span) : 0;
      const f = p * (rooms.length - 1);

      for (let i = 0; i < rooms.length; i += 1) {
        const d = f - i;
        const panel = panelRefs.current[i];
        const img = imgRefs.current[i];
        const shade = shadeRefs.current[i];
        if (!panel) continue;

        if (d <= 0) {
          // ainda subindo do rodapé da tela
          panel.style.transform = `translate3d(0, ${(-d * 100).toFixed(3)}%, 0)`;
          if (img) img.style.transform = `scale(${(1 + -d * 0.06).toFixed(4)})`;
          if (shade) shade.style.opacity = "0";
        } else {
          // já passou: sobe mais devagar e escurece atrás do próximo
          panel.style.transform = `translate3d(0, ${(-d * 22).toFixed(3)}%, 0)`;
          if (img) img.style.transform = `scale(${(1 + Math.min(d, 1) * 0.08).toFixed(4)})`;
          if (shade) shade.style.opacity = clamp01(d * 0.9).toFixed(3);
        }
        panel.style.visibility = d > 1.15 ? "hidden" : "visible";
      }

      sticky.style.setProperty("--cue", (1 - clamp01(p * 7)).toFixed(3));

      const idx = Math.max(0, Math.min(rooms.length - 1, Math.round(f)));
      if (idx !== last) {
        last = idx;
        setActive(idx);
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

  if (reduced) {
    return (
      <section id="ambientes" className="hc-section">
        <div className="hc-shell">
          <div className="hc-rooms__static">
            {rooms.map((room) => (
              <figure key={room.id}>
                <img src={room.img} alt={`${room.kicker}: ${room.title}`} loading="lazy" />
                <figcaption>{room.kicker}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="ambientes"
      ref={wrapRef}
      className="hc-film"
      style={{ height: `${rooms.length * 110}svh` }}
      aria-label="Percurso pelos ambientes"
    >
      <div ref={stickyRef} className="hc-film__sticky" style={{ "--cue": 1 } as CSSProperties}>
        {rooms.map((room, i) => (
          <div
            key={room.id}
            className="hc-film__panel"
            ref={(el) => { panelRefs.current[i] = el; }}
            style={{ zIndex: i + 1, transform: i === 0 ? undefined : "translate3d(0,100%,0)" }}
            aria-hidden={i !== active}
          >
            <img
              ref={(el) => { imgRefs.current[i] = el; }}
              src={room.img}
              alt={`${room.kicker} — ${room.title}`}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
            />
            <div className="hc-film__grade" />
            <div className="hc-film__shade" ref={(el) => { shadeRefs.current[i] = el; }} />

            <div className="hc-film__cap">
              <div className="hc-film__slate">
                <i />
                <span>{String(i + 1).padStart(2, "0")} — {room.kicker}</span>
              </div>
              <h2>{room.title}</h2>
              <p>{room.text}</p>
            </div>
          </div>
        ))}

        <span className="hc-bar hc-bar--top" />
        <span className="hc-bar hc-bar--bottom" />
        <div className="hc-grain" aria-hidden="true" />

        <div className="hc-film__reel" aria-hidden="true">
          {rooms.map((room, i) => (
            <span key={room.id} className={`hc-film__frame${i === active ? " is-on" : ""}`} />
          ))}
        </div>

        <div className="hc-film__cue" aria-hidden="true">
          <i />
          Role pela casa
        </div>
      </div>
    </section>
  );
}
