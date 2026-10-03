import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import AppShell from "@/components/app/AppShell";
import Field from "@/components/app/Field";
import PageHeader from "@/components/app/PageHeader";
import { useCriarOrdem, useCriarVeiculo, useVeiculos } from "@/hooks/useOficina";
import { TIPOS_DE_SERVICO, normalizarPlaca, placaValida } from "@/lib/ordens";

/* SCREEN 3 — Abrir ordem.
   Objetivo: dizer qual carro, qual problema e quando pode levar.
   Quem não tem veículo cai direto no cadastro do veículo — sem tela intermediária. */

const NOVO = "__novo__";

type Erros = Partial<Record<"placa" | "marca" | "modelo" | "veiculo" | "servico" | "data", string>>;

/** Hoje em AAAA-MM-DD, no fuso local — o input[type=date] não aceita ISO com hora. */
function hojeLocal(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

const NovaOrdem = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const veiculos = useVeiculos();
  const criarVeiculo = useCriarVeiculo();
  const criarOrdem = useCriarOrdem();

  const [veiculoId, setVeiculoId] = useState<string>("");
  const [novo, setNovo] = useState({ placa: "", marca: "", modelo: "", ano: "" });
  const [servico, setServico] = useState("");
  const [sintoma, setSintoma] = useState("");
  const [data, setData] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const alertaRef = useRef<HTMLDivElement>(null);
  const semVeiculo = !veiculos.isLoading && (veiculos.data?.length ?? 0) === 0;
  const cadastrandoVeiculo = veiculoId === NOVO || semVeiculo;

  // Sem veículo salvo não existe escolha a fazer: o formulário já abre no cadastro.
  useEffect(() => {
    if (semVeiculo) setVeiculoId(NOVO);
    else if (!veiculoId && veiculos.data?.length) setVeiculoId(veiculos.data[0].id);
  }, [semVeiculo, veiculos.data, veiculoId]);

  useEffect(() => {
    if (erroGeral) alertaRef.current?.focus();
  }, [erroGeral]);

  const enviando = criarVeiculo.isPending || criarOrdem.isPending;
  const minimoData = useMemo(hojeLocal, []);

  const validar = (): Erros => {
    const e: Erros = {};
    if (cadastrandoVeiculo) {
      if (!novo.placa) e.placa = "Informe a placa do carro.";
      else if (!placaValida(novo.placa))
        e.placa = "Placa incompleta. Use o formato ABC1D23 ou ABC1234.";
      if (!novo.marca.trim()) e.marca = "Informe a marca. Ex.: Fiat.";
      if (!novo.modelo.trim()) e.modelo = "Informe o modelo. Ex.: Uno.";
    } else if (!veiculoId) {
      e.veiculo = "Escolha qual carro vai para a oficina.";
    }
    if (!servico) e.servico = "Escolha o serviço. Se não souber, use a última opção.";
    if (data && data < minimoData) e.data = "Escolha hoje ou uma data futura.";
    return e;
  };

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setErroGeral(null);

    const achados = validar();
    setErros(achados);
    if (Object.keys(achados).length > 0) {
      // Foco no primeiro campo inválido, não no topo da página.
      const primeiro = document.querySelector<HTMLElement>('[aria-invalid="true"]');
      primeiro?.focus();
      return;
    }

    try {
      let idDoVeiculo = veiculoId;

      if (cadastrandoVeiculo) {
        const criado = await criarVeiculo.mutateAsync({
          plate: novo.placa,
          brand: novo.marca.trim(),
          model: novo.modelo.trim(),
          year: novo.ano ? Number(novo.ano) : null,
        });
        idDoVeiculo = criado.id;
      }

      const ordem = await criarOrdem.mutateAsync({
        vehicle_id: idDoVeiculo,
        service_type: servico,
        description: sintoma.trim() || null,
        scheduled_date: data ? new Date(`${data}T09:00:00`).toISOString() : null,
      });

      toast({ title: "Ordem aberta", description: "A oficina já consegue ver seu pedido." });
      navigate(`/painel/os/${ordem.id}?nova=1`, { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setErroGeral(
        msg.toLowerCase().includes("fetch")
          ? "Sem conexão com o servidor. Verifique a internet e envie de novo."
          : "Não consegui abrir a ordem. Confira os campos e tente novamente.",
      );
    }
  };

  return (
    <AppShell largura="estreito">
      <PageHeader
        titulo="Abrir ordem de serviço"
        descricao="Quatro perguntas. A oficina confirma o horário depois."
        voltar={
          <Button variant="ghost" size="sm" asChild className="-ml-3">
            <Link to="/painel">
              <ArrowLeft size={16} aria-hidden="true" />
              Voltar ao painel
            </Link>
          </Button>
        }
      />

      {veiculos.isLoading ? (
        <div className="space-y-6" aria-busy="true">
          <Skeleton className="h-[72px] w-full rounded-sm" />
          <Skeleton className="h-[72px] w-full rounded-sm" />
          <Skeleton className="h-[120px] w-full rounded-sm" />
        </div>
      ) : (
        <form onSubmit={enviar} className="space-y-6 pb-24 sm:pb-0" noValidate>
          {erroGeral && (
            <div
              ref={alertaRef}
              tabIndex={-1}
              role="alert"
              className="flex items-start gap-2 rounded-sm border border-destructive/40 bg-destructive/10 p-3 text-small text-destructive"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              {erroGeral}
            </div>
          )}

          {/* 1. Qual carro */}
          {semVeiculo ? (
            <p className="rounded-sm border border-border bg-card p-3 text-small text-muted-foreground">
              Primeiro carro? Preencha os dados abaixo — eles ficam salvos para as próximas
              ordens.
            </p>
          ) : (
            <Field rotulo="Qual carro" erro={erros.veiculo} obrigatorio>
              {(p) => (
                <Select value={veiculoId} onValueChange={setVeiculoId} disabled={enviando}>
                  <SelectTrigger id={p.id} aria-invalid={p["aria-invalid"]} aria-describedby={p["aria-describedby"]}>
                    <SelectValue placeholder="Escolha o veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {veiculos.data?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plate} — {v.brand} {v.model}
                      </SelectItem>
                    ))}
                    <SelectItem value={NOVO}>+ Cadastrar outro veículo</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </Field>
          )}

          {cadastrandoVeiculo && (
            <fieldset className="space-y-4 rounded-xl border border-border bg-card p-4">
              <legend className="px-1 text-caption text-muted-foreground">DADOS DO VEÍCULO</legend>

              <Field rotulo="Placa" erro={erros.placa} obrigatorio>
                {(p) => (
                  <Input
                    {...p}
                    value={novo.placa}
                    onChange={(e) => setNovo((s) => ({ ...s, placa: normalizarPlaca(e.target.value) }))}
                    placeholder="ABC1D23"
                    autoCapitalize="characters"
                    inputMode="text"
                    maxLength={7}
                    disabled={enviando}
                    className="font-display uppercase tracking-widest"
                  />
                )}
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field rotulo="Marca" erro={erros.marca} obrigatorio>
                  {(p) => (
                    <Input
                      {...p}
                      value={novo.marca}
                      onChange={(e) => setNovo((s) => ({ ...s, marca: e.target.value }))}
                      placeholder="Fiat"
                      disabled={enviando}
                    />
                  )}
                </Field>

                <Field rotulo="Modelo" erro={erros.modelo} obrigatorio>
                  {(p) => (
                    <Input
                      {...p}
                      value={novo.modelo}
                      onChange={(e) => setNovo((s) => ({ ...s, modelo: e.target.value }))}
                      placeholder="Uno"
                      disabled={enviando}
                    />
                  )}
                </Field>
              </div>

              <Field rotulo="Ano">
                {(p) => (
                  <Input
                    {...p}
                    type="number"
                    inputMode="numeric"
                    min={1950}
                    max={new Date().getFullYear() + 1}
                    value={novo.ano}
                    onChange={(e) => setNovo((s) => ({ ...s, ano: e.target.value }))}
                    placeholder="2014"
                    disabled={enviando}
                  />
                )}
              </Field>
            </fieldset>
          )}

          {/* 2. Qual serviço */}
          <Field rotulo="O que precisa" erro={erros.servico} obrigatorio>
            {(p) => (
              <Select value={servico} onValueChange={setServico} disabled={enviando}>
                <SelectTrigger id={p.id} aria-invalid={p["aria-invalid"]} aria-describedby={p["aria-describedby"]}>
                  <SelectValue placeholder="Escolha o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DE_SERVICO.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>

          {/* 3. O sintoma, nas palavras do dono */}
          <Field
            rotulo="O que está acontecendo"
            dica="Quanto mais específico, menos tempo de diagnóstico."
          >
            {(p) => (
              <Textarea
                {...p}
                value={sintoma}
                onChange={(e) => setSintoma(e.target.value)}
                placeholder="Ex.: o carro não pega de manhã, mas liga normal à tarde."
                rows={4}
                disabled={enviando}
              />
            )}
          </Field>

          {/* 4. Quando pode levar */}
          <Field
            rotulo="Quando pretende levar"
            dica="A oficina confirma o horário pelo WhatsApp."
            erro={erros.data}
          >
            {(p) => (
              <Input
                {...p}
                type="date"
                min={minimoData}
                value={data}
                onChange={(e) => setData(e.target.value)}
                disabled={enviando}
              />
            )}
          </Field>

          {/* Barra de ação: fixa no mobile, em fluxo no desktop */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card p-4 shadow-overlay sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
            <div className="container flex gap-3 sm:px-0">
              <Button type="submit" className="flex-1 sm:flex-none" size="lg" disabled={enviando}>
                <Plus size={16} aria-hidden="true" />
                {enviando ? "Abrindo…" : "Abrir ordem"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                asChild
                className="hidden sm:inline-flex"
                disabled={enviando}
              >
                <Link to="/painel">Cancelar</Link>
              </Button>
            </div>
          </div>
        </form>
      )}
    </AppShell>
  );
};

export default NovaOrdem;
