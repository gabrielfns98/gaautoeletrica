import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { MessageCircle, Phone, Mail, MapPin, Clock, Send } from "lucide-react";
import { brand, waLink, propertyTypes, frequencies } from "./content";
import { BubbleField, Reveal } from "./fx";

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
      <BubbleField count={16} seed={41} tone="ink" peak={0.45} />
      <div className="hc-shell hc-contact__grid">
        <Reveal>
          <div>
            <span className="hc-eyebrow">Orçamento em 5 minutos</span>
            <h2 className="hc-title" style={{ color: "#f4fdff", marginTop: "1.1rem" }}>
              Conta o que precisa.<br />
              <span className="hc-grad">A gente responde hoje.</span>
            </h2>
            <p className="hc-lede" style={{ marginTop: "1.2rem", maxWidth: "30rem" }}>
              Sem visita técnica e sem compromisso. Responde o formulário e já sai com o valor
              fechado no WhatsApp.
            </p>

            <ul className="hc-contact__list">
              <li><span className="hc-ico" style={{ width: "2.5rem", height: "2.5rem" }}><Phone size={18} /></span> {brand.whatsappLabel}</li>
              <li><span className="hc-ico" style={{ width: "2.5rem", height: "2.5rem" }}><Mail size={18} /></span> {brand.email}</li>
              <li><span className="hc-ico" style={{ width: "2.5rem", height: "2.5rem" }}><MapPin size={18} /></span> {brand.region}</li>
              <li><span className="hc-ico" style={{ width: "2.5rem", height: "2.5rem" }}><Clock size={18} /></span> {brand.hours}</li>
            </ul>
          </div>
        </Reveal>

        <Reveal delay={140}>
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
                <input id="hc-area" value={form.area} onChange={set("area")} placeholder="80" inputMode="numeric" />
              </div>
            </div>

            <div className="hc-field">
              <label htmlFor="hc-freq">Com que frequência?</label>
              <select id="hc-freq" value={form.freq} onChange={set("freq")}>
                {frequencies.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>

            <div className="hc-field">
              <label htmlFor="hc-obs">Algo que a gente precisa saber</label>
              <textarea id="hc-obs" value={form.obs} onChange={set("obs")} placeholder="Tenho dois gatos, o box está com calcário, prefiro produto sem cheiro…" />
            </div>

            <button type="submit" className="hc-btn hc-btn--primary hc-btn--lg" style={{ width: "100%" }}>
              <Send size={18} /> Receber meu orçamento
            </button>
            <p className="hc-form__note">
              <MessageCircle size={13} style={{ display: "inline", verticalAlign: "-2px" }} /> Abre direto no WhatsApp com tudo preenchido — você só confere e envia.
            </p>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
