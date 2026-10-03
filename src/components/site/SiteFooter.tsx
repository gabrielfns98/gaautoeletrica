import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OFICINA, enderecoCompleto, linkWhatsApp } from "@/config/contato";
import Logo from "@/components/app/Logo";

const SiteFooter = () => (
  <footer className="surface-ink bg-background" id="contato">
    <div className="container py-12 sm:py-16">
      <div className="grid gap-10 md:grid-cols-[1fr_auto]">
        <div className="space-y-6">
          <Logo />

          <ul className="space-y-4 text-small text-white/70">
            <li className="flex gap-3">
              <MapPin size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
              <span>
                <a
                  className="rounded-sm text-white underline-offset-4 hover:underline"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoCompleto())}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {OFICINA.endereco.linha1}
                </a>
                <br />
                {OFICINA.endereco.linha2}
                <br />
                {OFICINA.endereco.cidade} · CEP {OFICINA.endereco.cep}
              </span>
            </li>

            <li className="flex gap-3">
              <Phone size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
              <span className="flex flex-col gap-0.5">
                {OFICINA.telefones.map((t) => (
                  <a
                    key={t}
                    href={`tel:+55${t.replace(/\D/g, "")}`}
                    className="rounded-sm text-white underline-offset-4 hover:underline"
                  >
                    {t}
                  </a>
                ))}
              </span>
            </li>

            <li className="flex gap-3">
              <Mail size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
              <a
                href={`mailto:${OFICINA.email}`}
                className="rounded-sm text-white underline-offset-4 hover:underline"
              >
                {OFICINA.email}
              </a>
            </li>

            <li className="flex gap-3">
              <Clock size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
              <span>{OFICINA.horario.dias}, {OFICINA.horario.faixa}</span>
            </li>
          </ul>
        </div>

        <div className="md:w-64">
          <p className="text-small text-white/70">
            Prefere conversar? Chame no WhatsApp com a placa do carro em mãos.
          </p>
          <Button variant="accent" className="mt-4 w-full" asChild>
            <a
              href={linkWhatsApp("Olá! Gostaria de falar sobre um serviço elétrico no meu carro.")}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={16} aria-hidden="true" />
              Falar no WhatsApp
            </a>
          </Button>
        </div>
      </div>

      <p className="mt-12 border-t border-white/10 pt-6 text-caption font-normal tracking-normal text-white/50">
        © {new Date().getFullYear()} {OFICINA.nome}. Todos os direitos reservados.
      </p>
    </div>
  </footer>
);

export default SiteFooter;
