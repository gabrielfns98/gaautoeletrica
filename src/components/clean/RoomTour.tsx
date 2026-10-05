import { useCallback, useEffect, useRef, useState } from "react";
import { rooms, roomsIntro } from "./content";
import { useReducedMotion } from "./hooks";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * Percurso pela casa: cada rolagem traz o próximo cômodo de baixo enquanto o
 * anterior sobe mais devagar. Fica dentro de um quadro, com título e abas,
 * para ler como seção de site e não como vídeo em tela cheia.
 */
export default function RoomTour() {
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
      const span = rect.height - (sticky.clientHeight || window.innerHeight);
      const p = span > 0 ? clamp01(-rect.top / span) : 0;
      const f = p * (rooms.length - 1);

      for (let i = 0; i < rooms.length; i += 1) {
        const d = f - i;
        const panel = panelRefs.current[i];
        const img = imgRefs.current[i];
        const shade = shadeRefs.current[i];
        if (!panel) continue;

        if (d <= 0) {
          panel.style.transform = `translate3d(0, ${(-d * 100).toFixed(3)}%, 0)`;
          if (img) img.style.transform = `scale(${(1 + -d * 0.05).toFixed(4)})`;
          if (shade) shade.style.opacity = "0";
        } else {
          panel.style.transform = `translate3d(0, ${(-d * 20).toFixed(3)}%, 0)`;
          if (img) img.style.transform = `scale(${(1 + Math.min(d, 1) * 0.07).toFixed(4)})`;
          if (shade) shade.style.opacity = clamp01(d * 0.85).toFixed(3);
        }
        panel.style.visibility = d > 1.15 ? "hidden" : "visible";
      }

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

  /** Clicar numa aba leva ao trecho de rolagem daquele cômodo. */
  const goTo = useCallback((i: number) => {
    const wrap = wrapRef.current;
    const sticky = stickyRef.current;
    if (!wrap || !sticky) return;
    const span = wrap.offsetHeight - (sticky.clientHeight || window.innerHeight);
    const top = wrap.offsetTop + (span * i) / Math.max(1, rooms.length - 1);
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  if (reduced) {
    return (
      <section id="ambientes" className="hc-section">
        <div className="hc-shell">
          <div className="hc-head">
            <span className="hc-head__label hc-label">{roomsIntro.badge}</span>
            <h2 className="hc-head__title hc-title">{roomsIntro.title}</h2>
            <p className="hc-head__text hc-body">{roomsIntro.text}</p>
          </div>
          <div className="hc-rooms__static" style={{ marginTop: "3rem" }}>
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
      className="hc-tour"
      style={{ height: `${rooms.length * 95}svh` }}
      aria-label="Percurso pelos ambientes"
    >
      <div ref={stickyRef} className="hc-tour__sticky">
        <div className="hc-tour__head hc-shell">
          <span className="hc-label">{roomsIntro.badge}</span>
          <h2>{roomsIntro.title}</h2>
          <p>{roomsIntro.text}</p>
        </div>

        <div className="hc-tour__stage">
          {rooms.map((room, i) => (
            <div
              key={room.id}
              className="hc-tour__panel"
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
              <div className="hc-tour__grade" />
              <div className="hc-tour__shade" ref={(el) => { shadeRefs.current[i] = el; }} />
            </div>
          ))}

          {/* legenda fora dos painéis: não é fatiada pela transição */}
          <div className="hc-tour__cap">
            <div className="hc-tour__capInner" key={rooms[active].id}>
              <div className="hc-tour__slate">
                <i />
                <span>
                  {String(active + 1).padStart(2, "0")} / {String(rooms.length).padStart(2, "0")} — {rooms[active].kicker}
                </span>
              </div>
              <h3>{rooms[active].title}</h3>
              <p>{rooms[active].text}</p>
              <div className="hc-tour__tags">
                {rooms[active].tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </div>
          </div>
        </div>

        <div className="hc-tour__tabs hc-shell">
          {rooms.map((room, i) => (
            <button
              key={room.id}
              type="button"
              className="hc-tour__tab"
              aria-current={i === active}
              onClick={() => goTo(i)}
            >
              {room.kicker}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
