import { useEffect, useRef, useState, type CSSProperties } from "react";
import { rooms, roomsIntro } from "./content";
import { useReducedMotion } from "./hooks";

/** Fatia do scroll usada para a imagem sair de card pequeno e virar tela cheia. */
const OPEN_PHASE = 0.2;
/** Pausa inicial com o card ainda pequeno, para dar tempo de ler o título. */
const HOLD = 0.05;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Espuma do rodo que acompanha a borda da transição entre ambientes. */
const SUDS = Array.from({ length: 22 }, (_, i) => {
  const seeded = (i * 9301 + 49297) % 233280 / 233280;
  return {
    left: (i / 22) * 100 + seeded * 3,
    size: 8 + seeded * 26,
    bottom: -6 + seeded * 30,
  };
});

export default function ScrollRooms() {
  const reduced = useReducedMotion();
  const wrapRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const foamRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    let lastActive = -1;

    const render = () => {
      frame = 0;
      const wrap = wrapRef.current;
      const sticky = stickyRef.current;
      const stage = stageRef.current;
      if (!wrap || !sticky || !stage) return;

      const rect = wrap.getBoundingClientRect();
      const vh = sticky.clientHeight || window.innerHeight;
      const span = rect.height - vh;
      const p = span > 0 ? clamp01(-rect.top / span) : 0;

      /* ---- fase 1: o card cresce até ocupar a tela ---- */
      const open = easeOut(clamp01((p - HOLD) / OPEN_PHASE));
      const narrow = window.innerWidth < 760;
      const rest = 1 - open;
      stage.style.setProperty("--sx", `${((narrow ? 6 : 25) * rest).toFixed(2)}%`);
      stage.style.setProperty("--st", `${((narrow ? 44 : 40) * rest).toFixed(2)}%`);
      stage.style.setProperty("--sb", `${((narrow ? 7 : 9) * rest).toFixed(2)}%`);
      stage.style.setProperty("--sr", `${(34 * rest).toFixed(1)}px`);
      sticky.style.setProperty("--intro", (1 - clamp01(open * 1.7)).toFixed(3));
      sticky.style.setProperty("--ui", clamp01((open - 0.82) / 0.18).toFixed(3));
      sticky.style.setProperty("--hint", (1 - clamp01((p - HOLD) / (OPEN_PHASE * 0.45))).toFixed(3));

      /* ---- fase 2: o rodo sobe e troca o ambiente ---- */
      const t = clamp01((p - HOLD - OPEN_PHASE) / (1 - HOLD - OPEN_PHASE)) * (rooms.length - 1);
      let edge = 0;

      for (let i = 0; i < rooms.length; i += 1) {
        const reveal = i === 0 ? 1 : clamp01(t - (i - 1));
        const next = i + 1 < rooms.length ? clamp01(t - i) : 0;
        const layer = layerRefs.current[i];
        const img = imgRefs.current[i];

        if (layer && i > 0) {
          const y = (1 - reveal) * 118 - 9;
          layer.style.clipPath =
            `polygon(0% ${(y + 9).toFixed(2)}%, 100% ${(y - 9).toFixed(2)}%, 100% 220%, 0% 220%)`;
          layer.style.visibility = reveal <= 0 ? "hidden" : "visible";
        }
        if (img) img.style.transform = `scale(${(1.14 - 0.14 * reveal + 0.1 * next).toFixed(4)})`;
        if (i > 0 && reveal > 0 && reveal < 1) edge = reveal;
      }

      const foam = foamRef.current;
      if (foam) {
        if (edge > 0) {
          const h = sticky.clientHeight;
          const w = sticky.clientWidth || 1;
          const yPx = (((1 - edge) * 118 - 9) / 100) * h;
          const angle = -(Math.atan2(h * 0.18, w) * 180) / Math.PI;
          foam.style.transform = `translate3d(0, ${(yPx - foam.offsetHeight).toFixed(1)}px, 0) rotate(${angle.toFixed(2)}deg)`;
          foam.style.opacity = (1 - Math.abs(edge * 2 - 1)).toFixed(3);
        } else {
          foam.style.opacity = "0";
        }
      }

      const idx = Math.max(0, Math.min(rooms.length - 1, Math.round(t)));
      if (idx !== lastActive) {
        lastActive = idx;
        setActive(idx);
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };

    render();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [reduced]);

  /* ---- fallback sem animação ---- */
  if (reduced) {
    return (
      <section id="ambientes" className="hc-section hc-section--dark">
        <div className="hc-shell">
          <div className="hc-head hc-head--center">
            <span className="hc-eyebrow">{roomsIntro.badge}</span>
            <h2 className="hc-title">{roomsIntro.title}</h2>
            <p className="hc-lede">{roomsIntro.text}</p>
          </div>
          <div className="hc-rooms__static hc-mt">
            {rooms.map((room) => (
              <figure key={room.id} className="hc-rooms__staticCard">
                <img src={room.img} alt={`${room.kicker}: ${room.title}`} loading="lazy" />
                <figcaption>{room.kicker}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const room = rooms[active];

  return (
    <section
      id="ambientes"
      ref={wrapRef}
      className="hc-rooms"
      style={{ height: `${rooms.length * 92 + 70}svh` }}
      aria-label="Ambientes atendidos"
    >
      <div
        ref={stickyRef}
        className="hc-rooms__sticky"
        style={{ "--intro": 1, "--ui": 0, "--hint": 1 } as CSSProperties}
      >
        {/* título que fica atrás do card e some quando ele cresce */}
        <div className="hc-rooms__intro">
          <span className="hc-eyebrow">{roomsIntro.badge}</span>
          <h2 className="hc-title hc-title--xl">{roomsIntro.title}</h2>
          <p className="hc-lede">{roomsIntro.text}</p>
        </div>

        <div ref={stageRef} className="hc-rooms__stage">
          {rooms.map((item, i) => (
            <div
              key={item.id}
              className="hc-room"
              ref={(el) => { layerRefs.current[i] = el; }}
              style={i > 0 ? { clipPath: "polygon(0% 118%, 100% 100%, 100% 220%, 0% 220%)" } : undefined}
              aria-hidden={i !== active}
            >
              <img
                className="hc-room__img"
                ref={(el) => { imgRefs.current[i] = el; }}
                src={item.img}
                alt={`${item.kicker} — ${item.title}`}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
              />
            </div>
          ))}

          {/* rodo de espuma na borda da transição */}
          <div ref={foamRef} className="hc-foam" aria-hidden="true">
            <div className="hc-foam__glow" />
            <div className="hc-foam__suds">
              {SUDS.map((s, i) => (
                <i key={i} style={{ left: `${s.left}%`, bottom: `${s.bottom}px`, width: s.size, height: s.size }} />
              ))}
            </div>
            <div className="hc-foam__bar" />
          </div>

          {/* textos sobre a imagem */}
          <div className="hc-rooms__ui">
            <div className="hc-rooms__badge">
              <span className="hc-eyebrow">{roomsIntro.badge}</span>
            </div>

            <div className="hc-rooms__caption">
              <div className="hc-rooms__capInner" key={room.id}>
                <span className="hc-rooms__num">
                  {String(active + 1).padStart(2, "0")} / {String(rooms.length).padStart(2, "0")} · {room.kicker}
                </span>
                <h3>{room.title}</h3>
                <p>{room.text}</p>
                <div className="hc-rooms__tags">
                  {room.tags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
              </div>
            </div>

            <div className="hc-rooms__rail" aria-hidden="true">
              {rooms.map((item, i) => (
                <span key={item.id} className={`hc-rooms__dot${i === active ? " is-on" : ""}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="hc-rooms__hint" aria-hidden="true">
          <span className="hc-rooms__mouse"><i /></span>
          Role para limpar
        </div>
      </div>
    </section>
  );
}
