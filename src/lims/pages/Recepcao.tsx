/* ============================================================
   BANCADA — recepção e protocolo de amostras
   ============================================================ */

import { useMemo, useState } from 'react';
import { ClipboardCheck, PackagePlus, Minus, Plus, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useAcoes, useBancada, useIndices } from '../data/store';
import { data as fData, dataHora, moeda, tempoRelativo } from '../lib/format';
import { BarraFiltros, CabecalhoPagina, Pilula, Secao, Tabela, Vazio, filtrar } from '../components/primitivos';
import type { Amostra, Ensaio, GrupoAnaliseId, LoteRecepcao, Prioridade } from '../types';

export default function Recepcao() {
  const { estado, usuario, unidade, pode } = useBancada();
  const { criarRecepcao } = useAcoes();
  const { clientePorId, usuarioPorId, grupoPorId } = useIndices();

  const [busca, setBusca] = useState('');
  const [clienteId, setClienteId] = useState(estado.clientes[0]?.id ?? '');
  const [grupoId, setGrupoId] = useState<GrupoAnaliseId>('solo');
  const [quantidade, setQuantidade] = useState(6);
  const [prioridade, setPrioridade] = useState<Prioridade>('normal');
  const [notaRemessa, setNotaRemessa] = useState('');
  const [transportadora, setTransportadora] = useState('Entrega própria');
  const [conforme, setConforme] = useState(true);
  const [naoConformidade, setNaoConformidade] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [selecionados, setSelecionados] = useState<string[]>([]);

  const grupo = grupoPorId.get(grupoId);
  const parametrosDoGrupo = useMemo(
    () => estado.parametros.filter((p) => p.grupoId === grupoId && p.ativo),
    [estado.parametros, grupoId],
  );

  // ao trocar de grupo, pré-seleciona o escopo mais pedido: pH e principais
  const escopo = useMemo(() => {
    const ids = selecionados.filter((id) => parametrosDoGrupo.some((p) => p.id === id));
    if (ids.length > 0) return ids;
    return parametrosDoGrupo.filter((p) => p.ehPh || p.preco > 0).slice(0, 6).map((p) => p.id);
  }, [selecionados, parametrosDoGrupo]);

  const valorEstimado = useMemo(() => {
    const cliente = clientePorId.get(clienteId);
    const tabela = estado.tabelasPreco.find((t) => t.id === cliente?.tabelaPrecoId);
    const bruto = escopo.reduce(
      (s, id) => s + (estado.parametros.find((p) => p.id === id)?.preco ?? 0), 0,
    ) * quantidade;
    return bruto * (1 - (tabela?.desconto ?? 0) / 100);
  }, [escopo, quantidade, clienteId, clientePorId, estado.tabelasPreco, estado.parametros]);

  const alternarParametro = (id: string) => {
    setSelecionados(escopo.includes(id) ? escopo.filter((x) => x !== id) : [...escopo, id]);
  };

  const protocolar = () => {
    const cliente = clientePorId.get(clienteId);
    if (!cliente || !grupo || escopo.length === 0) {
      toast.error('Selecione cliente, grupo e ao menos um ensaio.');
      return;
    }

    const agora = new Date();
    const prazo = new Date(agora);
    prazo.setDate(prazo.getDate() + grupo.prazoPadraoDias);
    const ano = String(agora.getFullYear()).slice(2);
    const base = estado.amostras.length + 20_000;

    const lote: LoteRecepcao = {
      id: `rec-${Date.now()}`,
      numero: `REC-${agora.getFullYear()}-${String(900 + estado.lotesRecepcao.length).padStart(4, '0')}`,
      clienteId: cliente.id,
      dataRecepcao: agora.toISOString(),
      recebidoPorId: usuario.id,
      quantidadeAmostras: quantidade,
      notaFiscalRemessa: notaRemessa || undefined,
      transportadora,
      observacoes: observacoes || undefined,
    };

    const novasAmostras: Amostra[] = Array.from({ length: quantidade }, (_, i) => ({
      id: `am-${Date.now()}-${i}`,
      protocolo: `${ano}.${String(base + i).padStart(6, '0')}`,
      loteRecepcaoId: lote.id,
      clienteId: cliente.id,
      grupoId,
      unidadeId: unidade.id,
      identificacaoCampo: `${cliente.nomeFantasia ?? cliente.nome} — amostra ${i + 1}`,
      dataColeta: agora.toISOString(),
      dataRecepcao: agora.toISOString(),
      prazoEntrega: prazo.toISOString(),
      status: 'recebida',
      prioridade,
      conformeNoRecebimento: conforme,
      naoConformidade: conforme ? undefined : (naoConformidade || 'Não conformidade registrada na entrada'),
      posicaoBandeja: `B${String((estado.amostras.length % 24) + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
    }));

    const novosEnsaios: Ensaio[] = novasAmostras.flatMap((a) =>
      escopo.map((pid, k) => ({
        id: `ens-${Date.now()}-${a.id}-${k}`,
        amostraId: a.id,
        parametroId: pid,
        status: 'pendente' as const,
        unidade: estado.parametros.find((p) => p.id === pid)?.unidade ?? '',
      })),
    );

    criarRecepcao(lote, novasAmostras, novosEnsaios);
    setSelecionados([]);
    setNotaRemessa('');
    setObservacoes('');
    setNaoConformidade('');
    setConforme(true);

    toast.success(`${lote.numero} protocolado`, {
      description: `${quantidade} amostras e ${novosEnsaios.length} ensaios criados. Prazo: ${fData(prazo)}.`,
    });
  };

  const lotesFiltrados = useMemo(
    () => filtrar(
      [...estado.lotesRecepcao].sort((a, b) => +new Date(b.dataRecepcao) - +new Date(a.dataRecepcao)),
      busca,
      (l) => [l.numero, clientePorId.get(l.clienteId)?.nome, l.notaFiscalRemessa, l.transportadora],
    ),
    [estado.lotesRecepcao, busca, clientePorId],
  );

  return (
    <>
      <CabecalhoPagina
        eyebrow="Entrada"
        titulo="Recepção de amostras"
        descricao="Protocolo de lotes, conferência de conformidade na entrada e distribuição automática dos ensaios para a bancada."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="space-y-5">
          {pode('recepcao:criar') && (
            <Secao titulo="Novo protocolo" descricao="Os ensaios são abertos conforme o escopo escolhido.">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label className="label-micro mb-2 block">Grupo de análise</Label>
                  <Select value={grupoId} onValueChange={(v) => { setGrupoId(v as GrupoAnaliseId); setSelecionados([]); }}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-80">
                      {estado.grupos.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          <span className="flex w-full items-center gap-2">
                            <span className="num text-[0.65rem] text-muted-foreground">{g.abreviacao}</span>
                            <span className="uppercase">{g.nome}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {grupo && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {grupo.descricao} · prazo padrão de {grupo.prazoPadraoDias} dias
                      {grupo.temPh && ' · inclui determinação de pH'}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="label-micro mb-2 block">Empresa / cliente</Label>
                  <Select value={clienteId} onValueChange={setClienteId}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-80">
                      {estado.clientes.filter((c) => c.ativo).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="num mr-2 text-[0.65rem] text-muted-foreground">{c.codigo}</span>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="label-micro mb-2 block">Quantidade de amostras</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0"
                      onClick={() => setQuantidade((q) => Math.max(1, q - 1))} aria-label="Diminuir"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number" min={1} max={500} value={quantidade}
                      onChange={(e) => setQuantidade(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                      className="num h-10 text-center text-lg"
                    />
                    <Button
                      type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0"
                      onClick={() => setQuantidade((q) => Math.min(500, q + 1))} aria-label="Aumentar"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="label-micro mb-2 block">Prioridade</Label>
                  <Select value={prioridade} onValueChange={(v) => setPrioridade(v as Prioridade)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgente">Urgente — prazo reduzido</SelectItem>
                      <SelectItem value="emergencial">Emergencial — fura a fila</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="label-micro mb-2 block" htmlFor="nf-remessa">NF de remessa</Label>
                  <Input id="nf-remessa" value={notaRemessa} onChange={(e) => setNotaRemessa(e.target.value)} placeholder="opcional" className="num h-10" />
                </div>

                <div className="sm:col-span-2">
                  <Label className="label-micro mb-2 block">Transportadora</Label>
                  <Select value={transportadora} onValueChange={setTransportadora}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Entrega própria', 'Correios SEDEX', 'Braspress', 'Jadlog', 'Rodonaves', 'Retirada no cliente'].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* --- Escopo --- */}
              <div className="mt-6 border-t border-[hsl(var(--line-soft))] pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="label-micro">Escopo de ensaios</p>
                  <span className="num text-xs text-muted-foreground">
                    {escopo.length} de {parametrosDoGrupo.length}
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {parametrosDoGrupo.map((p) => {
                    const marcado = escopo.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={cn(
                          'flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-sm)] border p-3 transition-colors',
                          marcado
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-[hsl(var(--line-soft))] hover:bg-[hsl(var(--surface-raised))]',
                        )}
                      >
                        <Checkbox checked={marcado} onCheckedChange={() => alternarParametro(p.id)} className="mt-0.5" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-xs font-medium text-foreground">{p.nome}</span>
                            {p.ehPh && <Pilula tom="primario" className="shrink-0 px-1.5 py-0 text-[0.58rem]">pH</Pilula>}
                          </span>
                          <span className="mt-0.5 block truncate text-[0.66rem] text-muted-foreground">{p.metodo}</span>
                          <span className="num mt-1 block text-[0.66rem] text-muted-foreground">{moeda(p.preco)}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* --- Conformidade --- */}
              <div className="mt-6 border-t border-[hsl(var(--line-soft))] pt-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Amostras conformes na entrada</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Massa suficiente, identificação legível e acondicionamento adequado.
                    </p>
                  </div>
                  <Switch checked={conforme} onCheckedChange={setConforme} />
                </div>
                {!conforme && (
                  <div className="mt-4">
                    <Label className="label-micro mb-2 block" htmlFor="nc">Descrição da não conformidade</Label>
                    <Textarea
                      id="nc" value={naoConformidade} onChange={(e) => setNaoConformidade(e.target.value)}
                      rows={2} placeholder="Ex.: frasco de água sem preservante; cliente autorizado a prosseguir por e-mail."
                    />
                  </div>
                )}
              </div>

              <div className="mt-5">
                <Label className="label-micro mb-2 block" htmlFor="obs">Observações do lote</Label>
                <Textarea id="obs" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[hsl(var(--line-soft))] pt-5">
                <div>
                  <p className="label-micro mb-1">Valor estimado do lote</p>
                  <p className="num text-xl font-semibold text-foreground">{moeda(valorEstimado)}</p>
                  <p className="num mt-0.5 text-[0.68rem] text-muted-foreground">
                    {quantidade} amostras × {escopo.length} ensaios = {quantidade * escopo.length} determinações
                  </p>
                </div>
                <Button onClick={protocolar} size="lg" className="gap-2">
                  <PackagePlus className="h-4 w-4" /> Protocolar lote
                </Button>
              </div>
            </Secao>
          )}

          <Secao titulo="Lotes recebidos" semPadding>
            <div className="px-5 pt-5">
              <BarraFiltros busca={busca} aoBuscar={setBusca} placeholder="Buscar por lote, cliente ou NF…" />
            </div>
            <Tabela
              colunas={[
                { chave: 'numero', titulo: 'Lote', valor: (l) => l.numero, render: (l) => <span className="num text-xs font-medium">{l.numero}</span> },
                { chave: 'cliente', titulo: 'Cliente', valor: (l) => clientePorId.get(l.clienteId)?.nome ?? '', render: (l) => <span className="truncate text-xs">{clientePorId.get(l.clienteId)?.nome}</span> },
                { chave: 'qtd', titulo: 'Amostras', alinhamento: 'direita', valor: (l) => l.quantidadeAmostras, render: (l) => <span className="num text-xs">{l.quantidadeAmostras}</span> },
                { chave: 'transp', titulo: 'Transporte', secundaria: true, render: (l) => <span className="text-xs text-muted-foreground">{l.transportadora}</span> },
                { chave: 'recebedor', titulo: 'Recebido por', secundaria: true, render: (l) => <span className="text-xs text-muted-foreground">{usuarioPorId.get(l.recebidoPorId)?.nome.split(' ')[0]}</span> },
                { chave: 'data', titulo: 'Entrada', alinhamento: 'direita', valor: (l) => l.dataRecepcao, render: (l) => <span className="num text-xs text-muted-foreground">{dataHora(l.dataRecepcao)}</span> },
              ]}
              dados={lotesFiltrados.slice(0, 40)}
              chaveDe={(l) => l.id}
              ordenacaoInicial={{ chave: 'data', direcao: 'desc' }}
              vazio={<Vazio icone={ClipboardCheck} titulo="Nenhum lote encontrado" />}
            />
          </Secao>
        </div>

        {/* --- Lateral --- */}
        <div className="space-y-5">
          <Secao titulo="Conferência na entrada" descricao="POP-REC-002">
            <ol className="space-y-3 text-xs leading-relaxed text-muted-foreground">
              {[
                'Confira a quantidade recebida contra a relação do cliente.',
                'Verifique identificação legível e indelével em cada embalagem.',
                'Para água, confirme preservante e temperatura de conservação.',
                'Pese e registre a massa quando o escopo exigir mínimo.',
                'Fotografe qualquer avaria antes de abrir a embalagem.',
                'Registre a não conformidade e comunique o cliente antes de prosseguir.',
              ].map((t, i) => (
                <li key={t} className="flex gap-2.5">
                  <span className="num flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[0.6rem] font-semibold text-primary">
                    {i + 1}
                  </span>
                  {t}
                </li>
              ))}
            </ol>
          </Secao>

          <Secao titulo="Não conformidades recentes">
            {estado.amostras.filter((a) => !a.conformeNoRecebimento).slice(0, 6).length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">Nenhuma ocorrência registrada.</p>
            ) : (
              <ul className="space-y-3">
                {estado.amostras.filter((a) => !a.conformeNoRecebimento).slice(0, 6).map((a) => (
                  <li key={a.id} className="flex gap-2.5">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--warning))]" />
                    <div className="min-w-0">
                      <p className="num text-xs font-medium text-foreground">{a.protocolo}</p>
                      <p className="text-[0.7rem] leading-relaxed text-muted-foreground">{a.naoConformidade}</p>
                      <p className="mt-0.5 text-[0.66rem] text-muted-foreground/70">{tempoRelativo(a.dataRecepcao)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Secao>
        </div>
      </div>
    </>
  );
}
