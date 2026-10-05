import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowUpRight } from "lucide-react";
import { brand, waLink, propertyTypes, frequencies } from "./content";
import { Fade, Mask } from "./fx";

const EMPTY = { nome: "", zap: "", tipo: propertyTypes[0], area: "", freq: frequencies[2], obs: "" };

export default function Contact() {
  const [form, setForm] = useState(EMPTY);

  const set = (key: keyof typeof EMPTY) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.zap.trim()) {
      toast.error("Preencha nome e WhatsApp para a gente conseguir responder.");
      return;
    }
    const msg = [
      `Oi, ${brand.name}! Quero um orçamento de limpeza.`,
      "",
      `Nome: ${form.nome}`,
      `WhatsApp: ${form.zap}`,
      `Imóvel: ${form.tipo}`,
      form.area ? `Metragem: ${form.area} m²` : null,
      `Frequência: ${form.freq}`,
      form.obs ? `Detalhes: ${form.obs}` : null,
    ].filter(Boolean).join("\n");

    window.open(waLink(msg), "_blank", "noopener,noreferrer");
    toast.success("Pedido montado! É só enviar na janela do WhatsApp.");
  };

  return (
    <section id="orcamento" className="hc-section hc-contact">
      <div className="hc-shell hc-contact__grid">
        <div className="hc-contact__left">
          <span className="hc-label">Orçamento em 5 minutos</span>
          <h2 className="hc-title" style={{ color: "var(--paper)", marginTop: "1.2rem" }}>
            <Mask><span>Conta o que precisa.</span></Mask>
            <Mask delay={110}><em>A gente responde hoje.</em></Mask>
          </h2>

          <ul className="hc-contact__list">
            <li><span>WhatsApp</span><a href={waLink(`Oi, ${brand.name}!`)} target="_blank" rel="noreferrer">{brand.whatsappLabel}</a></li>
            <li><span>E-mail</span><a href={`mailto:${brand.email}`}>{brand.email}</a></li>
            <li><span>Atendimento</span>{brand.region}</li>
            <li><span>Horário</span>{brand.hours}</li>
          </ul>
        </div>

        <Fade delay={120} className="hc-contact__right">
          <form className="hc-form" onSubmit={submit}>
            <div className="hc-form__row">
              <div className="hc-field">
                <label htmlFor="hc-nome">Seu nome</label>
                <input id="hc-nome" value={form.nome} onChange={set("nome")} placeholder="Como te chamamos?" autoComplete="name" />
              </div>
              <div className="hc-field">
                <label htmlFor="hc-zap">WhatsApp</label>
                <input id="hc-zap" value={form.zap} onChange={set("zap")} placeholder="(11) 90000-0000" inputMode="tel" autoComplete="tel" />
              </div>
            </div>

            <div className="hc-form__row">
              <div className="hc-field">
                <label htmlFor="hc-tipo">Tipo de imóvel</label>
                <select id="hc-tipo" value={form.tipo} onChange={set("tipo")}>
                  {propertyTypes.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="hc-field">
                <label htmlFor="hc-area">Metragem aproximada</label>
                <input id="hc-area" value={form.area} onChange={set("area")} placeholder="80 m²" inputMode="numeric" />
              </div>
            </div>

            <div className="hc-field">
              <label htmlFor="hc-freq">Com que frequência</label>
              <select id="hc-freq" value={form.freq} onChange={set("freq")}>
                {frequencies.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>

            <div className="hc-field">
              <label htmlFor="hc-obs">Algo que a gente precisa saber</label>
              <textarea id="hc-obs" value={form.obs} onChange={set("obs")} placeholder="Tenho dois gatos, o box está com calcário, prefiro produto sem cheiro…" />
            </div>

            <button type="submit" className="hc-btn hc-btn--solid">
              Receber meu orçamento <ArrowUpRight size={15} />
            </button>
            <p className="hc-form__note">
              Abre direto no WhatsApp com tudo preenchido — você só confere e envia.
            </p>
          </form>
        </Fade>
      </div>
    </section>
  );
}
