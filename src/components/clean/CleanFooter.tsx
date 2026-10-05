import { Instagram, MessageCircle, Mail } from "lucide-react";
import { brand, navLinks, services, waLink } from "./content";
import { Logo } from "./fx";

export default function CleanFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="hc-footer">
      <div className="hc-shell">
        <div className="hc-footer__grid">
          <div>
            <Logo />
            <p style={{ marginTop: "1.1rem", maxWidth: "22rem", fontSize: "0.93rem", lineHeight: 1.7 }}>
              Limpeza residencial e corporativa com equipe própria, checklist conferido e garantia
              de 48 horas. {brand.region}.
            </p>
            <div className="hc-social" style={{ marginTop: "1.4rem" }}>
              <a href={brand.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={18} /></a>
              <a href={waLink(`Oi, ${brand.name}!`)} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle size={18} /></a>
              <a href={`mailto:${brand.email}`} aria-label="E-mail"><Mail size={18} /></a>
            </div>
          </div>

          <div>
            <h4>Navegue</h4>
            <ul>
              {navLinks.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
            </ul>
          </div>

          <div>
            <h4>Serviços</h4>
            <ul>
              {services.slice(0, 5).map((s) => <li key={s.title}><a href="#servicos">{s.title}</a></li>)}
            </ul>
          </div>

          <div>
            <h4>Contato</h4>
            <ul>
              <li><a href={waLink(`Oi, ${brand.name}!`)} target="_blank" rel="noreferrer">{brand.whatsappLabel}</a></li>
              <li><a href={`mailto:${brand.email}`}>{brand.email}</a></li>
              <li>{brand.hours}</li>
              <li><a href="#orcamento">Pedir orçamento</a></li>
            </ul>
          </div>
        </div>

        <div className="hc-footer__bar">
          <span>© {year} {brand.name}. Todos os direitos reservados.</span>
          <span>CNPJ 00.000.000/0001-00 · Feito para quem odeia faxina.</span>
        </div>
      </div>
    </footer>
  );
}
