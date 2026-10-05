import { brand, navLinks, services, waLink } from "./content";

export default function CleanFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="hc-footer">
      <div className="hc-shell">
        <div className="hc-footer__word">House Clean</div>

        <div className="hc-footer__grid">
          <div>
            <h4>A empresa</h4>
            <p style={{ fontSize: "0.9rem", lineHeight: 1.75, maxWidth: "20rem" }}>
              Limpeza residencial e corporativa com equipe própria, checklist conferido
              e garantia de 48 horas. {brand.region}.
            </p>
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
              <li><a href={brand.instagram} target="_blank" rel="noreferrer">Instagram</a></li>
              <li>{brand.hours}</li>
            </ul>
          </div>
        </div>

        <div className="hc-footer__bar">
          <span>© {year} {brand.name}</span>
          <span>CNPJ 00.000.000/0001-00</span>
        </div>
      </div>
    </footer>
  );
}
