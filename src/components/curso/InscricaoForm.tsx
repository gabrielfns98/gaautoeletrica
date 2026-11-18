import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, CreditCard, Loader2, QrCode } from "lucide-react";
import { MODO_DEMO } from "@/config/curso";
import { cn } from "@/lib/utils";
import type { InscricaoSalva } from "./Pagamento";

const somenteDigitos = (v: string) => v.replace(/\D/g, "");

const mascaraTelefone = (v: string) => {
  const d = somenteDigitos(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
};

const mascaraCpf = (v: string) => {
  const d = somenteDigitos(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

const cpfValido = (cpf: string) => {
  const d = somenteDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (len: number) => {
    let soma = 0;
    for (let i = 0; i < len; i++) soma += Number(d[i]) * (len + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
};

const schema = z.object({
  nome: z.string().trim().min(3, "Informe seu nome completo").max(120),
  whatsapp: z
    .string()
    .refine((v) => [10, 11].includes(somenteDigitos(v).length), "Informe um WhatsApp com DDD"),
  email: z.union([z.literal(""), z.string().trim().email("E-mail inválido").max(160)]),
  cpf: z.union([z.literal(""), z.string().refine(cpfValido, "CPF inválido")]),
  cidade: z.string().trim().max(80),
  experiencia: z.enum(["nenhuma", "basica", "trabalho_na_area"]),
  forma_pagamento: z.enum(["pix", "link"]),
  /** Campo-isca invisível contra robôs de spam. */
  empresa: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const inputCls =
  "w-full rounded-lg border border-curso-ink/15 bg-white px-3.5 py-3 text-[15px] text-curso-ink placeholder:text-curso-ink/35 outline-none transition focus:border-curso-ink focus:ring-2 focus:ring-curso-yellow/60";

interface Props {
  onInscrito: (i: InscricaoSalva) => void;
}

const InscricaoForm = ({ onInscrito }: Props) => {
  const [enviando, setEnviando] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: "",
      whatsapp: "",
      email: "",
      cpf: "",
      cidade: "Uberaba",
      experiencia: "nenhuma",
      forma_pagamento: "pix",
      empresa: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setEnviando(true);
    const inscricao: InscricaoSalva = {
      nome: data.nome.trim(),
      whatsapp: mascaraTelefone(data.whatsapp),
      email: data.email.trim(),
      cpf: data.cpf,
      cidade: data.cidade.trim(),
      experiencia: data.experiencia,
      forma_pagamento: data.forma_pagamento,
    };

    if (MODO_DEMO) {
      await new Promise((r) => setTimeout(r, 600));
    } else {
      // Envia a inscrição para a oficina (planilha/aviso). Se falhar, o aluno segue para o pagamento.
      try {
        const resp = await fetch("/api/inscricao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...inscricao, empresa: data.empresa }),
        });
        if (!resp.ok) console.warn("Aviso de inscrição não enviado:", await resp.text());
      } catch (e) {
        console.warn("Aviso de inscrição não enviado:", e);
      }
    }

    setEnviando(false);
    onInscrito(inscricao);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        {...register("empresa")}
      />
      <Campo label="Nome completo" erro={errors.nome?.message} htmlFor="nome">
        <input id="nome" autoComplete="name" placeholder="Como vai sair no certificado" className={inputCls} {...register("nome")} />
      </Campo>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo label="WhatsApp" erro={errors.whatsapp?.message} htmlFor="whatsapp">
          <Controller
            name="whatsapp"
            control={control}
            render={({ field }) => (
              <input
                id="whatsapp"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="(34) 9 0000-0000"
                className={inputCls}
                value={field.value}
                onChange={(e) => field.onChange(mascaraTelefone(e.target.value))}
                onBlur={field.onBlur}
                ref={field.ref}
              />
            )}
          />
        </Campo>
        <Campo label="CPF" opcional="para o certificado" erro={errors.cpf?.message} htmlFor="cpf">
          <Controller
            name="cpf"
            control={control}
            render={({ field }) => (
              <input
                id="cpf"
                inputMode="numeric"
                placeholder="000.000.000-00"
                className={inputCls}
                value={field.value}
                onChange={(e) => field.onChange(mascaraCpf(e.target.value))}
                onBlur={field.onBlur}
                ref={field.ref}
              />
            )}
          />
        </Campo>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo label="E-mail" opcional="opcional" erro={errors.email?.message} htmlFor="email">
          <input id="email" type="email" autoComplete="email" placeholder="voce@email.com" className={inputCls} {...register("email")} />
        </Campo>
        <Campo label="Cidade" erro={errors.cidade?.message} htmlFor="cidade">
          <input id="cidade" autoComplete="address-level2" className={inputCls} {...register("cidade")} />
        </Campo>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-curso-ink">Você já mexe com elétrica automotiva?</legend>
        <Controller
          name="experiencia"
          control={control}
          render={({ field }) => (
            <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  ["nenhuma", "Nunca mexi"],
                  ["basica", "Sei o básico"],
                  ["trabalho_na_area", "Já trabalho na área"],
                ] as const
              ).map(([valor, texto]) => (
                <Opcao key={valor} ativo={field.value === valor} onClick={() => field.onChange(valor)}>
                  {texto}
                </Opcao>
              ))}
            </div>
          )}
        />
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-curso-ink">Como prefere pagar?</legend>
        <Controller
          name="forma_pagamento"
          control={control}
          render={({ field }) => (
            <div role="radiogroup" className="grid grid-cols-2 gap-2">
              <Opcao ativo={field.value === "pix"} onClick={() => field.onChange("pix")}>
                <QrCode className="h-4 w-4" /> Pix
              </Opcao>
              <Opcao ativo={field.value === "link"} onClick={() => field.onChange("link")}>
                <CreditCard className="h-4 w-4" /> Cartão
              </Opcao>
            </div>
          )}
        />
      </fieldset>

      <button
        type="submit"
        disabled={enviando}
        className="group flex w-full items-center justify-center gap-2 rounded-xl bg-curso-yellow px-6 py-4 font-display text-lg font-extrabold tracking-tight text-curso-ink shadow-[0_8px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_0_0_#161616] active:translate-y-1 active:shadow-[0_3px_0_0_#161616] disabled:cursor-wait disabled:opacity-70"
      >
        {enviando ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> Enviando…
          </>
        ) : (
          <>
            Ir para o pagamento
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </button>
      <p className="text-center text-xs text-curso-muted">
        Seus dados são usados só para a sua inscrição e o certificado.
      </p>
    </form>
  );
};

const Campo = ({
  label,
  opcional,
  erro,
  htmlFor,
  children,
}: {
  label: string;
  opcional?: string;
  erro?: string;
  htmlFor: string;
  children: React.ReactNode;
}) => (
  <div>
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline gap-1.5 text-sm font-semibold text-curso-ink">
      {label}
      {opcional ? <span className="text-xs font-normal text-curso-muted">({opcional})</span> : null}
    </label>
    {children}
    {erro ? <p className="mt-1 text-xs font-medium text-red-600">{erro}</p> : null}
  </div>
);

const Opcao = ({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    role="radio"
    aria-checked={ativo}
    onClick={onClick}
    className={cn(
      "flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm font-semibold transition-colors",
      ativo
        ? "border-curso-ink bg-curso-ink text-white"
        : "border-curso-ink/10 bg-white text-curso-ink/75 hover:border-curso-ink/30",
    )}
  >
    {children}
  </button>
);

export default InscricaoForm;
