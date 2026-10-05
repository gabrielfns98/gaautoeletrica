import { useMemo, type CSSProperties, type ReactNode } from "react";

import { useInView } from "./hooks";

/* ---------------------------------------------------------------- reveal */

export function Reveal({
  children, delay = 0, className = "", id,
}: { children: ReactNode; delay?: number; className?: string; id?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      id={id}
      className={`hc-reveal${inView ? " is-in" : ""}${className ? ` ${className}` : ""}`}
      style={{ "--d": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- bolhas */

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function BubbleField({
  count = 16, seed = 11, tone = "light", peak = 0.75,
}: { count?: number; seed?: number; tone?: "light" | "ink"; peak?: number }) {
  const bubbles = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: count }, () => {
      const size = 6 + r() * 42;
      return {
        size,
        left: r() * 100,
        dx: (r() - 0.5) * 140,
        dist: 70 + r() * 60,
        dur: 14 + r() * 16,
        delay: -r() * 26,
        peak: peak * (0.4 + r() * 0.6),
      };
    });
  }, [count, seed, peak]);

  return (
    <div className={`hc-bubbles${tone === "ink" ? " hc-bubbles--ink" : ""}`} aria-hidden="true">
      {bubbles.map((b, i) => (
        <span
          key={i}
          className="hc-bubble"
          style={{
            width: `${b.size}px`, height: `${b.size}px`, left: `${b.left}%`,
            "--dx": `${b.dx}px`, "--dist": b.dist, "--dur": `${b.dur}s`,
            "--delay": `${b.delay}s`, "--peak": b.peak,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}

export function SparkleBurst({
  points, size = 18,
}: { points: { top: string; left: string; delay?: number; scale?: number }[]; size?: number }) {
  return (
    <>
      {points.map((p, i) => (
        <svg
          key={i}
          className="hc-spark"
          width={size * (p.scale ?? 1)}
          height={size * (p.scale ?? 1)}
          viewBox="-1 -1 2 2"
          aria-hidden="true"
          style={{ top: p.top, left: p.left, "--delay": `${p.delay ?? 0}s`, "--dur": `${3 + i * 0.37}s` } as CSSProperties}
        >
          <path
            fill="currentColor"
            d="M0,-1 C0.12,-0.34 0.34,-0.12 1,0 C0.34,0.12 0.12,0.34 0,1 C-0.12,0.34 -0.34,0.12 -1,0 C-0.34,-0.12 -0.12,-0.34 0,-1 Z"
          />
        </svg>
      ))}
    </>
  );
}

/* ---------------------------------------------------------------- marca */

export function LogoMark({ size = 42 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="hcLogoA" x1="8" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5eead4" />
          <stop offset="0.55" stopColor="#19c6da" />
          <stop offset="1" stopColor="#067d96" />
        </linearGradient>
      </defs>
      <path
        d="M24 3.5 C24 3.5 38.5 18.2 38.5 28.4 C38.5 36.7 32.1 43 24 43 C15.9 43 9.5 36.7 9.5 28.4 C9.5 18.2 24 3.5 24 3.5 Z"
        fill="url(#hcLogoA)"
      />
      <path d="M17.5 29.5 C17.5 24.6 20.6 21.4 24 17.8" stroke="#eafdff" strokeOpacity="0.72" strokeWidth="2.6" strokeLinecap="round" />
      <path
        d="M35.2 10.4 L36.6 14.6 L40.8 16 L36.6 17.4 L35.2 21.6 L33.8 17.4 L29.6 16 L33.8 14.6 Z"
        fill="#c7e86f"
      />
    </svg>
  );
}

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <a href="#topo" className={`hc-logo${dark ? " hc-logo--dark" : ""}`} aria-label="House Clean — início">
      <span className="hc-logo__mark"><LogoMark /></span>
      <span className="hc-logo__txt">
        <b>House Clean</b>
        <span>Limpeza profissional</span>
      </span>
    </a>
  );
}
