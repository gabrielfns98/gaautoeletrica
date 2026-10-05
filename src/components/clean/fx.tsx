import type { CSSProperties, ReactNode } from "react";
import { useInView } from "./hooks";

type RevealProps = { children: ReactNode; delay?: number; className?: string };

const vars = (delay: number) => ({ "--d": `${delay}ms` }) as CSSProperties;

/** Texto que sobe por trás de uma máscara. */
export function Mask({ children, delay = 0, className = "" }: RevealProps) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.1);
  return (
    <span ref={ref} className={`hc-mask${inView ? " is-in" : ""}${className ? ` ${className}` : ""}`} style={vars(delay)}>
      {children}
    </span>
  );
}

/** Entrada discreta para blocos que não são título. */
export function Fade({ children, delay = 0, className = "", id }: RevealProps & { id?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.12);
  return (
    <div ref={ref} id={id} className={`hc-fade${inView ? " is-in" : ""}${className ? ` ${className}` : ""}`} style={vars(delay)}>
      {children}
    </div>
  );
}

/** Imagem revelada por uma passada de baixo para cima, como um pano. */
export function Swipe({ children, delay = 0, className = "" }: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>(0.12);
  return (
    <div ref={ref} className={`hc-swipe${inView ? " is-in" : ""}${className ? ` ${className}` : ""}`} style={vars(delay)}>
      <div className="hc-swipe__inner">{children}</div>
    </div>
  );
}

export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <a href="#topo" className="hc-logo" onClick={onClick} aria-label="House Clean — início">
      <b>House Clean</b>
      <i>est. 2019</i>
    </a>
  );
}
