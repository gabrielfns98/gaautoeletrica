import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Check, Copy, CreditCard, ExternalLink, QrCode, RotateCcw } from "lucide-react";
import { CURSO, formatBRL, whatsappLink } from "@/config/curso";
import { gerarPixCopiaECola } from "@/lib/pix";
import { WhatsAppIcon } from "./icons";
import { cn } from "@/lib/utils";

export interface InscricaoSalva {
  nome: string;
  whatsapp: string;
  email?: string;
  cpf?: string;
  cidade?: string;
  experiencia?: string;
  forma_pagamento: "pix" | "link";
}

/** Dados da inscrição em texto, para as mensagens de WhatsApp. */
const resumo = (i: InscricaoSalva) =>
  [
    `Nome: ${i.nome}`,
    `WhatsApp: ${i.whatsapp}`,
    i.cpf ? `CPF: ${i.cpf}` : null,
    i.email ? `E-mail: ${i.email}` : null,
    i.cidade ? `Cidade: ${i.cidade}` : null,
  ]
    .filter(Boolean)
    .join("\n");

interface Props {
  inscricao: InscricaoSalva;
  onNovaInscricao: () => void;
}

const Pagamento = ({ inscricao, onNovaInscricao }: Props) => {
  const [forma, setForma] = useState<"pix" | "link">(inscricao.forma_pagamento);
  const [copiado, setCopiado] = useState(false);
  const primeiroNome = inscricao.nome.trim().split(/\s+/)[0];

  const valorPix = CURSO.valorPix ?? CURSO.valor;
  const temPix = CURSO.pix.chave.trim().length > 0;
  const temLink = CURSO.linkPagamento.trim().length > 0;

  const pixCopiaECola = useMemo(
    () =>
      temPix
        ? gerarPixCopiaECola({
            chave: CURSO.pix.chave,
            nome: CURSO.pix.nomeRecebedor,
            cidade: CURSO.pix.cidade,
            valor: valorPix,
            txid: "CURSONATAL",
          })
        : "",
    [temPix, valorPix],
  );

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(pixCopiaECola);
      setCopiado(true);
      toast.success("Código Pix copiado! Agora é só colar no app do seu banco.");
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      toast.error("Não foi possível copiar. Selecione o código e copie manualmente.");
    }
  };

  const formaTexto = forma === "pix" ? "Pix" : "cartão (link de pagamento)";
  const msgPagarWhats = `Olá! Fiz minha inscrição no Treinamento de Natal (${CURSO.titulo}).\n${resumo(inscricao)}\nQuero pagar via ${formaTexto}. Pode me passar os dados?`;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Check className="h-5 w-5" strokeWidth={3} />
        </span>
        <div>
          <h3 className="font-display text-2xl font-extrabold tracking-tight text-curso-ink">
            Inscrição recebida, {primeiroNome}!
          </h3>
          <p className="mt-1 text-sm text-curso-muted">
            Sua vaga é confirmada assim que o pagamento for identificado.
          </p>
        </div>
      </div>

      {/* Seletor de forma de pagamento */}
      <div role="tablist" aria-label="Forma de pagamento" className="grid grid-cols-2 gap-2 rounded-xl bg-curso-cream p-1.5">
        {(
          [
            { id: "pix", label: "Pix", icon: QrCode },
            { id: "link", label: "Cartão", icon: CreditCard },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={forma === id}
            onClick={() => setForma(id)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
              forma === id ? "bg-curso-ink text-white shadow" : "text-curso-ink/70 hover:text-curso-ink",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {forma === "pix" ? (
        temPix ? (
          <div className="space-y-4">
            {valorPix ? (
              <p className="text-center text-sm text-curso-muted">
                Valor no Pix: <strong className="text-lg text-curso-ink">{formatBRL(valorPix)}</strong>
              </p>
            ) : null}
            <div className="mx-auto w-fit rounded-2xl border-4 border-curso-yellow bg-white p-3">
              <QRCodeSVG value={pixCopiaECola} size={208} level="M" marginSize={0} title="QR Code Pix" />
            </div>
            <p className="text-center text-sm text-curso-muted">
              Abra o app do seu banco, escolha <strong>Pix &gt; Ler QR Code</strong>
              {valorPix ? "" : " e digite o valor combinado"}.
            </p>
            <div>
              <label htmlFor="pix-copia-cola" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-curso-muted">
                Ou use o Pix Copia e Cola
              </label>
              <div className="flex gap-2">
                <input
                  id="pix-copia-cola"
                  readOnly
                  value={pixCopiaECola}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 truncate rounded-lg border border-curso-ink/15 bg-curso-cream px-3 py-2.5 font-mono text-xs text-curso-ink"
                />
                <button
                  type="button"
                  onClick={copiar}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-curso-yellow px-4 text-sm font-bold text-curso-ink transition-colors hover:bg-curso-yellow-dark"
                >
                  {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiado ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <FallbackWhats texto="Os dados do Pix são enviados pelo WhatsApp." href={whatsappLink(msgPagarWhats)} />
        )
      ) : temLink ? (
        <div className="space-y-3 text-center">
          {CURSO.valor ? (
            <p className="text-sm text-curso-muted">
              Valor no cartão: <strong className="text-lg text-curso-ink">{formatBRL(CURSO.valor)}</strong>
              {CURSO.condicoes ? <span className="block">{CURSO.condicoes}</span> : null}
            </p>
          ) : null}
          <a
            href={CURSO.linkPagamento}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-curso-ink px-5 py-4 font-bold text-white transition-transform hover:-translate-y-0.5"
          >
            <CreditCard className="h-5 w-5 text-curso-yellow" />
            Pagar com cartão
            <ExternalLink className="h-4 w-4 opacity-60" />
          </a>
          <p className="text-xs text-curso-muted">
            Você será levado(a) para a página segura de pagamento do Mercado Pago.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {CURSO.valor ? (
            <p className="text-center text-sm text-curso-muted">
              Valor no cartão: <strong className="text-lg text-curso-ink">{formatBRL(CURSO.valor)}</strong>
              {CURSO.condicoes ? <span className="block">{CURSO.condicoes}</span> : null}
            </p>
          ) : null}
          <FallbackWhats texto="O link de pagamento no cartão é enviado pelo WhatsApp." href={whatsappLink(msgPagarWhats)} />
        </div>
      )}

      <button
        type="button"
        onClick={onNovaInscricao}
        className="mx-auto flex items-center gap-1.5 text-sm font-medium text-curso-muted underline-offset-4 hover:text-curso-ink hover:underline"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Fazer outra inscrição
      </button>
    </div>
  );
};

const FallbackWhats = ({ texto, href }: { texto: string; href: string }) => (
  <div className="rounded-xl border border-curso-ink/10 bg-curso-cream p-4 text-center">
    <p className="text-sm text-curso-ink">{texto}</p>
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-curso-yellow px-4 py-2.5 text-sm font-bold text-curso-ink hover:bg-curso-yellow-dark"
    >
      <WhatsAppIcon className="h-4 w-4" />
      Pedir dados de pagamento
    </a>
  </div>
);

export default Pagamento;
