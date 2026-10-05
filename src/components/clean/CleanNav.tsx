import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { brand, navLinks, waLink } from "./content";
import { Logo } from "./fx";

export default function CleanNav() {
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className={`hc-nav${stuck ? " is-stuck" : ""}`}>
      <div className="hc-shell">
        <nav className="hc-nav__bar" aria-label="Principal">
          <Logo />

          <div className="hc-nav__links">
            {navLinks.map((link) => (
              <a key={link.href} className="hc-nav__link" href={link.href}>{link.label}</a>
            ))}
          </div>

          <div className="hc-nav__actions">
            <a
              className="hc-btn hc-btn--solid"
              href={waLink(`Oi, ${brand.name}! Quero um orçamento de limpeza.`)}
              target="_blank"
              rel="noreferrer"
            >
              Orçamento
            </a>
            <button
              type="button"
              className="hc-nav__burger"
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>

        {open && (
          <div className="hc-nav__sheet">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</a>
            ))}
            <a href="#orcamento" onClick={() => setOpen(false)}>Pedir orçamento</a>
            <a
              href={waLink(`Oi, ${brand.name}! Quero um orçamento de limpeza.`)}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
            >
              WhatsApp
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
