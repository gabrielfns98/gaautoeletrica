/* ============================================================
   BANCADA — fiscal: NFS-e de serviços laboratoriais
   ============================================================ */

import { useMemo, useState } from 'react';
import { FileText, Receipt, Send, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useAcoes, useBancada, useIndices } from '../data/store';
import {
  CODIGOS_SERVICO, PARAMETROS_FISCAIS, apurarNotaServico, formatarChaveAcesso, rotuloCompetencia,
} from '../lib/fiscal';
import type { RegimeTributario } from '../lib/fiscal';
import { data as fData, mascaraDocumento, moeda, moedaCompacta, numero } from '../lib/format';
import {
  BarraFiltros, CabecalhoPagina, Campos, Indicador, Pilula, Secao, Segmentos, Tabela, Vazio, filtrar,
} from '../components/primitivos';
import type { TomStatus } from '../components/primitivos';
import type { NotaFiscal, StatusNota } from '../types';

const TOM: Record<StatusNota, TomStatus> = {
  rascunho: 'neutro',
  'em-processamento': 'info',
  autorizada: 'sucesso',
  rejeitada: 'erro',
  cancelada: 'neutro',
};

type Aba = 'notas' | 'emitir' | 'apuracao';

export default function Fiscal() {
  const { estado, pode } = useBancada();
  const { clientePorId } = useIndices();

  const [aba, setAba] = useState<Aba>('notas');
  const [busca, setBusca] = useState('');
  const [aberta, setAberta] = useState<NotaFiscal | null>(null);

  const competencia = new Date().toISOString().slice(0, 7);

  const kpis = useMemo(() => {
    const doMes = estado.notasFiscais.filter((n) => n.competencia === competencia && n.status === 'autorizada');
    const soma = (f: (n: NotaFiscal) => number) => doMes.reduce((s, n) => s + f(n), 0);
    return {
      faturado: soma((n) => n.valorServicos),
      iss: soma((n) => n.valorIss),
      retencoes: soma((n) => n.valorIr + n.valorPis + n.valorCofins + n.valorCsll + n.valorInss),
      liquido: soma((n) => n.valorLiquido),
      quantidade: doMes.length,
      rejeitadas: estado.notasFiscais.filter((n) => n.status === 'rejeitada').length,
    };
  }, [estado.notasFiscais, competencia]);

  const porCompetencia = useMemo(() => {
    const mapa = new Map<string, { servicos: number; iss: number; retencoes: number; n: number }>();
    for (const n of estado.notasFiscais) {
      if (n.status !== 'autorizada') continue;
      const atual = mapa.get(n.competencia) ?? { servicos: 0, iss: 0, retencoes: 0, n: 0 };
      atual.servicos += n.valorServicos;
      atual.iss += n.valorIss;
      atual.retencoes += n.valorIr + n.valorPis + n.valorCofins + n.valorCsll + n.valorInss;
      atual.n++;
      mapa.set(n.competencia, atual);
    }
    return [...mapa.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [estado.notasFiscais]);

  const listadas = useMemo(
    () => filtrar(estado.notasFiscais, busca, (n) => [
      n.numero, n.discriminacao, clientePorId.get(n.clienteId)?.nome, n.chaveAcesso,
    ]),
    [estado.notasFiscais, busca, clientePorId],
  );

  return (
    <>
      <CabecalhoPagina
        eyebrow="Obrigações"
        titulo="Fiscal"
        descricao="Emissão de NFS-e sobre os laudos entregues, com ISS municipal e retenções federais apuradas automaticamente."
      >
        <div className="mt-6">
          <Segmentos
            valor={aba}
            aoMudar={setAba}
            opcoes={[
              { valor: 'notas', rotulo: 'Notas emitidas', contagem: estado.notasFiscais.length },
              { valor: 'emitir', rotulo: 'Emitir NFS-e' },
              { valor: 'apuracao', rotulo: 'Apuração mensal' },
            ]}
          />
        </div>
      </CabecalhoPagina>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador rotulo={`Faturado — ${rotuloCompetencia(competencia)}`} valor={moedaCompacta(kpis.faturado)} detalhe={`${kpis.quantidade} notas autorizadas`} destaque />
        <Indicador rotulo="ISS do período" valor={moedaCompacta(kpis.iss)} detalhe="imposto sobre serviços" />
        <Indicador rotulo="Retenções federais" valor={moedaCompacta(kpis.retencoes)} detalhe="IR, PIS, COFINS e CSLL" />
        <Indicador rotulo="Notas rejeitadas" valor={kpis.rejeitadas} detalhe="pendentes de correção" destaque={kpis.rejeitadas > 0} icone={TriangleAlert} />
      </div>

      {aba === 'notas' && (
        <Secao semPadding>
          <div className="px-5 pt-5">
            <BarraFiltros busca={busca} aoBuscar={setBusca} placeholder="Buscar por número, cliente ou chave de acesso…" />
          </div>
          <Tabela
            colunas={[
              { chave: 'numero', titulo: 'Número', valor: (n) => Number(n.numero), render: (n) => <span className="num text-xs font-medium">{n.numero}<span className="ml-1 text-muted-foreground">/{n.serie}</span></span> },
              { chave: 'cliente', titulo: 'Tomador', valor: (n) => clientePorId.get(n.clienteId)?.nome ?? '', render: (n) => <span className="truncate text-xs">{clientePorId.get(n.clienteId)?.nomeFantasia}</span> },
              { chave: 'servico', titulo: 'Serviço', secundaria: true, render: (n) => <span className="num text-xs text-muted-foreground">{n.codigoServico}</span> },
              { chave: 'emissao', titulo: 'Emissão', alinhamento: 'direita', valor: (n) => n.emissao, render: (n) => <span className="num text-xs text-muted-foreground">{fData(n.emissao)}</span> },
              { chave: 'valor', titulo: 'Serviços', alinhamento: 'direita', valor: (n) => n.valorServicos, render: (n) => <span className="num text-xs">{moeda(n.valorServicos)}</span> },
              { chave: 'iss', titulo: 'ISS', alinhamento: 'direita', secundaria: true, render: (n) => <span className="num text-xs text-muted-foreground">{moeda(n.valorIss)}</span> },
              { chave: 'liquido', titulo: 'Líquido', alinhamento: 'direita', valor: (n) => n.valorLiquido, render: (n) => <span className="num text-xs font-medium">{moeda(n.valorLiquido)}</span> },
              {
                chave: 'status', titulo: 'Status', alinhamento: 'direita', valor: (n) => n.status,
                render: (n) => <Pilula tom={TOM[n.status]} className="px-1.5 py-0 text-[0.62rem]">{n.status}</Pilula>,
              },
            ]}
            dados={listadas.slice(0, 80)}
            chaveDe={(n) => n.id}
            aoClicar={setAberta}
            ordenacaoInicial={{ chave: 'emissao', direcao: 'desc' }}
            vazio={<Vazio icone={Receipt} titulo="Nenhuma nota encontrada" />}
          />
        </Secao>
      )}

      {aba === 'emitir' && <FormularioNota podeEmitir={pode('fiscal:criar')} />}

      {aba === 'apuracao' && (
        <Secao titulo="Apuração por competência" semPadding>
          <Tabela
            colunas={[
              { chave: 'comp', titulo: 'Competência', render: ([c]: [string, { servicos: number; iss: number; retencoes: number; n: number }]) => <span className="text-xs font-medium">{rotuloCompetencia(c)}</span> },
              { chave: 'n', titulo: 'Notas', alinhamento: 'direita', render: ([, v]) => <span className="num text-xs">{v.n}</span> },
              { chave: 'servicos', titulo: 'Serviços', alinhamento: 'direita', render: ([, v]) => <span className="num text-xs">{moeda(v.servicos)}</span> },
              { chave: 'iss', titulo: 'ISS', alinhamento: 'direita', render: ([, v]) => <span className="num text-xs text-muted-foreground">{moeda(v.iss)}</span> },
              { chave: 'ret', titulo: 'Retenções federais', alinhamento: 'direita', render: ([, v]) => <span className="num text-xs text-muted-foreground">{moeda(v.retencoes)}</span> },
              { chave: 'liq', titulo: 'Líquido', alinhamento: 'direita', render: ([, v]) => <span className="num text-xs font-medium">{moeda(v.servicos - v.retencoes)}</span> },
            ]}
            dados={porCompetencia}
            chaveDe={([c]) => c}
          />
        </Secao>
      )}

      <DetalheNota nota={aberta} aoFechar={() => setAberta(null)} />
    </>
  );
}

/* ---------------- Emissão ---------------- */

function FormularioNota({ podeEmitir }: { podeEmitir: boolean }) {
  const { estado } = useBancada();
  const { emitirNota } = useAcoes();
  const { clientePorId } = useIndices();

  const [clienteId, setClienteId] = useState(estado.clientes[0]?.id ?? '');
  const [valor, setValor] = useState('4800,00');
  const [codigoServico, setCodigoServico] = useState('17.09');
  const [aliquota, setAliquota] = useState('3');
  const [issRetido, setIssRetido] = useState(false);
  const [regime, setRegime] = useState<RegimeTributario>('presumido');
  const [discriminacao, setDiscriminacao] = useState(
    'Prestação de serviços de análise laboratorial agronômica conforme laudos anexos.',
  );

  const valorNum = Number(valor.replace(/\./g, '').replace(',', '.')) || 0;
  const aliquotaNum = Number(aliquota.replace(',', '.')) || 0;
  const cliente = clientePorId.get(clienteId);

  const apuracao = useMemo(
    () => apurarNotaServico({
      valorServicos: valorNum,
      aliquotaIss: aliquotaNum,
      issRetido,
      regime,
      tomadorPessoaJuridica: cliente?.tipo === 'PJ',
    }),
    [valorNum, aliquotaNum, issRetido, regime, cliente?.tipo],
  );

  const emitir = () => {
    if (!cliente || valorNum <= 0) {
      toast.error('Informe cliente e valor válidos.');
      return;
    }
    const n = emitirNota(cliente.id, valorNum, aliquotaNum, codigoServico, discriminacao);
    toast.success(`NFS-e ${n.numero} enviada`, {
      description: 'Aguardando retorno da prefeitura. Um título a receber foi gerado com vencimento em 28 dias.',
    });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <Secao titulo="Dados da nota" descricao="Serviço prestado — NFS-e municipal">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="label-micro mb-2 block">Tomador</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-80">
                {estado.clientes.filter((c) => c.ativo).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cliente && (
              <p className="num mt-2 text-xs text-muted-foreground">
                {mascaraDocumento(cliente.documento)} · {cliente.municipio}/{cliente.uf} · {cliente.tipo}
              </p>
            )}
          </div>

          <div>
            <Label className="label-micro mb-2 block" htmlFor="valor-nf">Valor dos serviços</Label>
            <Input id="valor-nf" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className="num h-10 text-lg" />
          </div>

          <div>
            <Label className="label-micro mb-2 block">Código do serviço (LC 116/03)</Label>
            <Select
              value={codigoServico}
              onValueChange={(v) => {
                setCodigoServico(v);
                const c = CODIGOS_SERVICO.find((x) => x.codigo === v);
                if (c) setAliquota(String(c.aliquotaSugerida));
              }}
            >
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CODIGOS_SERVICO.map((c) => (
                  <SelectItem key={c.codigo} value={c.codigo}>
                    <span className="num mr-2">{c.codigo}</span>{c.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="label-micro mb-2 block" htmlFor="aliq">Alíquota de ISS (%)</Label>
            <Input id="aliq" inputMode="decimal" value={aliquota} onChange={(e) => setAliquota(e.target.value)} className="num h-10" />
          </div>

          <div>
            <Label className="label-micro mb-2 block">Regime tributário do prestador</Label>
            <Select value={regime} onValueChange={(v) => setRegime(v as RegimeTributario)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="simples">Simples Nacional</SelectItem>
                <SelectItem value="presumido">Lucro Presumido</SelectItem>
                <SelectItem value="real">Lucro Real</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4 sm:col-span-2">
            <div>
              <p className="text-sm font-medium text-foreground">ISS retido na fonte</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                O tomador recolhe o imposto; o valor é descontado do líquido a receber.
              </p>
            </div>
            <Switch checked={issRetido} onCheckedChange={setIssRetido} />
          </div>

          <div className="sm:col-span-2">
            <Label className="label-micro mb-2 block" htmlFor="discr">Discriminação dos serviços</Label>
            <Textarea id="discr" value={discriminacao} onChange={(e) => setDiscriminacao(e.target.value)} rows={3} />
          </div>
        </div>
      </Secao>

      <div className="space-y-5">
        <Secao titulo="Apuração">
          <dl className="space-y-2.5 text-sm">
            <ItemApuracao rotulo="Valor dos serviços" valor={valorNum} />
            <ItemApuracao rotulo="Base de cálculo" valor={apuracao.baseCalculo} />
            <ItemApuracao rotulo={`ISS (${numero(aliquotaNum, 2)}%)`} valor={apuracao.valorIss} negativo={issRetido} />
            <div className="border-t border-[hsl(var(--line-soft))] pt-2.5">
              <ItemApuracao rotulo={`IRRF (${PARAMETROS_FISCAIS.aliquotaIrrf}%)`} valor={apuracao.valorIr} negativo />
              <ItemApuracao rotulo={`PIS (${PARAMETROS_FISCAIS.aliquotaPis}%)`} valor={apuracao.valorPis} negativo />
              <ItemApuracao rotulo={`COFINS (${PARAMETROS_FISCAIS.aliquotaCofins}%)`} valor={apuracao.valorCofins} negativo />
              <ItemApuracao rotulo={`CSLL (${PARAMETROS_FISCAIS.aliquotaCsll}%)`} valor={apuracao.valorCsll} negativo />
            </div>
            <div className="flex items-baseline justify-between border-t border-[hsl(var(--line-strong))] pt-3">
              <dt className="text-sm font-medium text-foreground">Líquido a receber</dt>
              <dd className="num text-lg font-semibold text-primary">{moeda(apuracao.valorLiquido)}</dd>
            </div>
          </dl>

          {apuracao.notas.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-[hsl(var(--line-soft))] pt-4">
              {apuracao.notas.map((n) => (
                <li key={n} className="text-[0.68rem] leading-relaxed text-muted-foreground">• {n}</li>
              ))}
            </ul>
          )}

          <Button onClick={emitir} disabled={!podeEmitir} className="mt-5 w-full gap-2">
            <Send className="h-4 w-4" /> Transmitir à prefeitura
          </Button>
          {!podeEmitir && (
            <p className="mt-2 text-center text-[0.68rem] text-muted-foreground">
              Seu papel não permite emitir notas fiscais.
            </p>
          )}
        </Secao>

        <Secao titulo="Regras aplicadas">
          <ul className="space-y-2.5 text-[0.7rem] leading-relaxed text-muted-foreground">
            <li>CSRF (PIS + COFINS + CSLL = 4,65%) dispensada em notas de até {moeda(PARAMETROS_FISCAIS.limiteDispensaCsrf)}.</li>
            <li>IRRF dispensado quando o imposto apurado não supera {moeda(PARAMETROS_FISCAIS.limiteDispensaIrrf)}.</li>
            <li>Optantes do Simples Nacional não sofrem retenção federal na fonte.</li>
            <li>Tomador pessoa física não retém tributos federais.</li>
            <li className="border-t border-[hsl(var(--line-soft))] pt-2.5 text-muted-foreground/80">
              Alíquotas e limites ficam centralizados em <span className="num">PARAMETROS_FISCAIS</span> para
              revisão da contabilidade a cada exercício.
            </li>
          </ul>
        </Secao>
      </div>
    </div>
  );
}

function ItemApuracao({ rotulo, valor, negativo }: { rotulo: string; valor: number; negativo?: boolean }) {
  if (valor === 0 && negativo) return null;
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className={`num text-xs ${negativo ? 'text-destructive' : 'text-foreground'}`}>
        {negativo && '− '}{moeda(valor)}
      </dd>
    </div>
  );
}

/* ---------------- Detalhe ---------------- */

function DetalheNota({ nota, aoFechar }: { nota: NotaFiscal | null; aoFechar: () => void }) {
  const { estado, unidade } = useBancada();
  const { clientePorId } = useIndices();
  if (!nota) return null;
  const cliente = clientePorId.get(nota.clienteId);
  const laudos = estado.laudos.filter((l) => nota.laudoIds.includes(l.id));

  return (
    <Sheet open onOpenChange={(a) => { if (!a) aoFechar(); }}>
      <SheetContent className="bancada w-full overflow-hidden border-l border-[hsl(var(--line-soft))] bg-background p-0 sm:max-w-xl">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader className="space-y-2 text-left">
              <Pilula tom={TOM[nota.status]} pontinho>{nota.status}</Pilula>
              <SheetTitle className="font-display text-3xl tracking-tight">
                <span className="num">NFS-e {nota.numero}</span>
              </SheetTitle>
              <SheetDescription>{cliente?.nome}</SheetDescription>
            </SheetHeader>

            {nota.motivoRejeicao && (
              <div className="mt-5 flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-destructive/30 bg-destructive/10 px-3.5 py-3">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <p className="text-xs font-medium text-destructive">Rejeitada pela prefeitura</p>
                  <p className="mt-0.5 text-[0.7rem] leading-relaxed text-muted-foreground">{nota.motivoRejeicao}</p>
                </div>
              </div>
            )}

            <div className="mt-6 panel p-5">
              <Campos
                itens={[
                  { rotulo: 'Prestador', valor: unidade.nome },
                  { rotulo: 'CNPJ prestador', valor: <span className="num">{unidade.cnpj}</span> },
                  { rotulo: 'Tomador', valor: cliente?.nome ?? '—' },
                  { rotulo: 'CNPJ tomador', valor: <span className="num">{mascaraDocumento(cliente?.documento ?? '')}</span> },
                  { rotulo: 'Emissão', valor: fData(nota.emissao) },
                  { rotulo: 'Competência', valor: rotuloCompetencia(nota.competencia) },
                  { rotulo: 'Código do serviço', valor: <span className="num">{nota.codigoServico}</span> },
                  { rotulo: 'Série', valor: nota.serie },
                ]}
              />
              <p className="mt-4 border-t border-[hsl(var(--line-soft))] pt-4 text-xs leading-relaxed text-muted-foreground">
                {nota.discriminacao}
              </p>
            </div>

            <div className="mt-5 panel p-5">
              <p className="label-micro mb-3">Composição</p>
              <dl className="space-y-2.5">
                <ItemApuracao rotulo="Valor dos serviços" valor={nota.valorServicos} />
                <ItemApuracao rotulo="Deduções" valor={nota.deducoes} />
                <ItemApuracao rotulo="Base de cálculo" valor={nota.baseCalculo} />
                <ItemApuracao rotulo={`ISS (${numero(nota.aliquotaIss, 2)}%)${nota.issRetido ? ' — retido' : ''}`} valor={nota.valorIss} negativo={nota.issRetido} />
                <ItemApuracao rotulo="IRRF" valor={nota.valorIr} negativo />
                <ItemApuracao rotulo="PIS" valor={nota.valorPis} negativo />
                <ItemApuracao rotulo="COFINS" valor={nota.valorCofins} negativo />
                <ItemApuracao rotulo="CSLL" valor={nota.valorCsll} negativo />
                <ItemApuracao rotulo="INSS" valor={nota.valorInss} negativo />
                <div className="flex items-baseline justify-between border-t border-[hsl(var(--line-strong))] pt-3">
                  <dt className="text-sm font-medium text-foreground">Líquido</dt>
                  <dd className="num text-lg font-semibold text-primary">{moeda(nota.valorLiquido)}</dd>
                </div>
              </dl>
            </div>

            {nota.chaveAcesso && (
              <div className="mt-5 panel-sunken p-4">
                <p className="label-micro mb-2">Chave de acesso</p>
                <p className="num break-all text-[0.68rem] leading-relaxed text-foreground">
                  {formatarChaveAcesso(nota.chaveAcesso)}
                </p>
                {nota.protocoloAutorizacao && (
                  <p className="num mt-2 text-[0.66rem] text-muted-foreground">
                    protocolo {nota.protocoloAutorizacao}
                  </p>
                )}
              </div>
            )}

            {laudos.length > 0 && (
              <div className="mt-5">
                <p className="label-micro mb-2.5">Laudos vinculados</p>
                <ul className="space-y-1.5">
                  {laudos.map((l) => (
                    <li key={l.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      <span className="num text-foreground">{l.numero}</span>
                      <span>· {l.amostraIds.length} amostras</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
