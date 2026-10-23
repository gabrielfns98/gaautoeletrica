"use client";

import { useActionState, useState } from "react";
import { salvarLogo, type ResultadoAction } from "@/app/actions";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from "@/lib/ui";

/**
 * Reduz a imagem no navegador e já a entrega recortada em círculo: nem o
 * cabeçalho do sistema nem o leitor de PDF arredondam a borda por conta
 * própria, então o recorte precisa vir na própria imagem.
 */
const LADO = 360;
/** A arte não encosta na borda do círculo, senão o nome da marca é cortado. */
const PROPORCAO_DA_ARTE = 0.8;

function recortarEmCirculo(arquivo: File): Promise<string> {
  return new Promise((pronto, falhou) => {
    const leitor = new FileReader();
    leitor.onerror = () => falhou(new Error("Não consegui ler o arquivo."));
    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => falhou(new Error("Arquivo não é uma imagem válida."));
      img.onload = () => {
        const tela = document.createElement("canvas");
        tela.width = LADO;
        tela.height = LADO;
        const ctx = tela.getContext("2d");
        if (!ctx) return falhou(new Error("Navegador não suporta o redimensionamento."));

        const raio = LADO / 2;
        ctx.beginPath();
        ctx.arc(raio, raio, raio, 0, Math.PI * 2);
        ctx.clip();

        // o fundo escuro acompanha logos desenhadas sobre preto
        ctx.fillStyle = "#080808";
        ctx.fillRect(0, 0, LADO, LADO);

        const lado = LADO * PROPORCAO_DA_ARTE;
        const escala = Math.min(lado / img.width, lado / img.height);
        const largura = img.width * escala;
        const altura = img.height * escala;
        ctx.drawImage(img, (LADO - largura) / 2, (LADO - altura) / 2, largura, altura);

        pronto(tela.toDataURL("image/png"));
      };
      img.src = String(leitor.result);
    };
    leitor.readAsDataURL(arquivo);
  });
}

export default function FormLogo({ logoAtual }: { logoAtual: string | null }) {
  const [previa, setPrevia] = useState<string | null>(null);
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [estado, enviar, enviando] = useActionState<ResultadoAction | null, FormData>(
    salvarLogo,
    null,
  );

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setErroLocal(null);
    try {
      setPrevia(await recortarEmCirculo(arquivo));
    } catch (erro) {
      setErroLocal(erro instanceof Error ? erro.message : "Não consegui ler a imagem.");
    }
  }

  const mostrando = previa ?? logoAtual;

  return (
    <form action={enviar} className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
      <input type="hidden" name="logo" value={previa ?? ""} />

      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-900">
          {mostrando ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mostrando} alt="Logo da oficina" className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs text-slate-400">sem logo</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <label className={`${BOTAO_SECUNDARIO} cursor-pointer`}>
            Escolher imagem
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={escolher}
            />
          </label>
          <p className="mt-1 text-xs text-slate-500">
            PNG, JPG ou WEBP. A imagem é recortada em círculo e aparece no topo do
            sistema e no cabeçalho do orçamento.
          </p>
        </div>
      </div>

      {(erroLocal || estado?.erro) && (
        <p className="mt-2 text-sm font-medium text-red-700">{erroLocal ?? estado?.erro}</p>
      )}

      {previa && (
        <button type="submit" disabled={enviando} className={`${BOTAO_PRIMARIO} mt-3 w-full py-3`}>
          {enviando ? "Salvando..." : "Salvar esta logo"}
        </button>
      )}
    </form>
  );
}
