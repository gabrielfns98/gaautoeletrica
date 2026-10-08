/* ============================================================
   BANCADA — CRM: carteira, funil e relacionamento
   ============================================================ */

import { useMemo, useState } from 'react';
import {
  Building2, CalendarClock, ChevronRight, Mail, Phone, Target, TrendingUp, Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useAcoes, useBancada, useIndices } from '../data/store';
import { data as fData, mascaraDocumento, moeda, moedaCompacta, numero, tempoRelativo } from '../lib/format';
import {
  BarraFiltros, CabecalhoPagina, Campos, Indicador, Pilula, Secao, Segmentos, Tabela, Vazio, filtrar,
} from '../components/primitivos';
import type { Cliente, EstagioFunil, Oportunidade } from '../types';

const FUNIL: Array<{ id: EstagioFunil; rotulo: string; cor: string }> = [
  { id: 'lead', rotulo: 'Lead', cor: 'var(--ph-12)' },
  { id: 'contato', rotulo: 'Contato', cor: 'var(--ph-11)' },
  { id: 'proposta', rotulo: 'Proposta', cor: 'var(--ph-9)' },
  { id: 'negociacao', rotulo: 'Negociação', cor: 'var(--ph-7)' },
  { id: 'ganho', rotulo: 'Ganho', cor: 'var(--success)' },
  { id: 'perdido', rotulo: 'Perdido', cor: 'var(--muted-foreground)' },
];

type Aba = 'funil' | 'carteira' | 'propostas';

export default function Crm() {
  const { estado, pode } = useBancada();
  const { clientePorId, usuarioPorId } = useIndices();
  const { moverOportunidade } = useAcoes();

  const [aba, setAba] = useState<Aba>('funil');
  const [busca, setBusca] = useState('');
  const [cliente, setCliente] = useState<Cliente | null>(null);

  const kpis = useMemo(() => {
    const abertas = estado.oportunidades.filter((o) => !['ganho', 'perdido'].includes(o.estagio));
    const pipeline = abertas.reduce((s, o) => s + o.valor, 0);
    const ponderado = abertas.reduce((s, o) => s + (o.valor * o.probabilidade) / 100, 0);
    const fechadas = estado.oportunidades.filter((o) => ['ganho', 'perdido'].includes(o.estagio));
    const ganhas = fechadas.filter((o) => o.estagio === 'ganho');
    return {
      pipeline,
      ponderado,
      taxaGanho: fechadas.length ? (ganhas.length / fechadas.length) * 100 : 0,
      ticket: ganhas.length ? ganhas.reduce((s, o) => s + o.valor, 0) / ganhas.length : 0,
      ativos: estado.clientes.filter((c) => c.ativo).length,
    };
  }, [estado.oportunidades, estado.clientes]);

  const clientesFiltrados = useMemo(
    () => filtrar(estado.clientes, busca, (c) => [c.nome, c.nomeFantasia, c.documento, c.municipio, c.segmento]),
    [estado.clientes, busca],
  );

  return (
    <>
      <CabecalhoPagina
        eyebrow="Comercial"
        titulo="CRM"
        descricao="Carteira de clientes, funil de oportunidades e histórico de relacionamento da equipe técnica comercial."
      >
        <div className="mt-6">
          <Segmentos
            valor={aba}
            aoMudar={setAba}
            opcoes={[
              { valor: 'funil', rotulo: 'Funil', contagem: estado.oportunidades.length },
              { valor: 'carteira', rotulo: 'Carteira', contagem: estado.clientes.length },
              { valor: 'propostas', rotulo: 'Propostas', contagem: estado.orcamentos.length },
            ]}
          />
        </div>
      </CabecalhoPagina>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador rotulo="Pipeline aberto" valor={moedaCompacta(kpis.pipeline)} detalhe={`ponderado ${moedaCompacta(kpis.ponderado)}`} icone={Target} destaque />
        <Indicador rotulo="Taxa de ganho" valor={`${numero(kpis.taxaGanho, 0)}%`} detalhe="sobre oportunidades fechadas" icone={TrendingUp} />
        <Indicador rotulo="Ticket médio" valor={moedaCompacta(kpis.ticket)} detalhe="contratos ganhos" />
        <Indicador rotulo="Clientes ativos" valor={kpis.ativos} detalhe={`${estado.contatos.length} contatos cadastrados`} icone={Users} />
      </div>

      {aba === 'funil' && (
        <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {FUNIL.map((coluna) => {
            const itens = estado.oportunidades.filter((o) => o.estagio === coluna.id);
            const total = itens.reduce((s, o) => s + o.valor, 0);
            return (
              <div key={coluna.id} className="panel flex flex-col overflow-hidden">
                <div className="border-b border-[hsl(var(--line-soft))] px-3.5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: `hsl(${coluna.cor})` }} aria-hidden />
                    <p className="text-xs font-medium text-foreground">{coluna.rotulo}</p>
                    <span className="num ml-auto text-[0.66rem] text-muted-foreground">{itens.length}</span>
                  </div>
                  <p className="num mt-1 text-[0.68rem] text-muted-foreground">{moedaCompacta(total)}</p>
                </div>
                <ScrollArea className="max-h-[28rem] flex-1">
                  <ul className="space-y-2 p-2.5">
                    {itens.map((o) => (
                      <CartaoOportunidade
                        key={o.id}
                        oportunidade={o}
                        podeMover={pode('crm:editar')}
                        aoMover={(estagio) => {
                          moverOportunidade(o.id, estagio);
                          toast.success('Oportunidade movida', { description: `${o.titulo} → ${FUNIL.find((f) => f.id === estagio)?.rotulo}` });
                        }}
                      />
                    ))}
                    {itens.length === 0 && (
                      <li className="px-2 py-6 text-center text-[0.68rem] text-muted-foreground">vazio</li>
                    )}
                  </ul>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      )}

      {aba === 'carteira' && (
        <Secao semPadding>
          <div className="px-5 pt-5">
            <BarraFiltros busca={busca} aoBuscar={setBusca} placeholder="Buscar por razão social, CNPJ, município ou segmento…" />
          </div>
          <Tabela
            colunas={[
              { chave: 'codigo', titulo: 'Código', valor: (c) => c.codigo, render: (c) => <span className="num text-xs text-muted-foreground">{c.codigo}</span> },
              {
                chave: 'nome', titulo: 'Cliente', valor: (c) => c.nome,
                render: (c) => (
                  <span className="block min-w-0">
                    <span className="block truncate text-xs font-medium text-foreground">{c.nome}</span>
                    <span className="num block truncate text-[0.66rem] text-muted-foreground">{mascaraDocumento(c.documento)}</span>
                  </span>
                ),
              },
              { chave: 'segmento', titulo: 'Segmento', secundaria: true, render: (c) => <span className="text-xs text-muted-foreground">{c.segmento}</span> },
              { chave: 'local', titulo: 'Praça', render: (c) => <span className="text-xs text-muted-foreground">{c.municipio}/{c.uf}</span> },
              {
                chave: 'consultor', titulo: 'Consultor', secundaria: true,
                render: (c) => <span className="text-xs text-muted-foreground">{c.consultorId ? usuarioPorId.get(c.consultorId)?.nome.split(' ')[0] : '—'}</span>,
              },
              { chave: 'cond', titulo: 'Pagamento', secundaria: true, render: (c) => <span className="num text-xs text-muted-foreground">{c.condicaoPagamento}</span> },
              {
                chave: 'amostras', titulo: 'Amostras', alinhamento: 'direita',
                valor: (c) => estado.amostras.filter((a) => a.clienteId === c.id).length,
                render: (c) => <span className="num text-xs">{estado.amostras.filter((a) => a.clienteId === c.id).length}</span>,
              },
              {
                chave: 'status', titulo: '', alinhamento: 'direita',
                render: (c) => (
                  <span className="flex items-center justify-end gap-2">
                    {!c.ativo && <Pilula tom="neutro" className="px-1.5 py-0 text-[0.6rem]">inativo</Pilula>}
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                ),
              },
            ]}
            dados={clientesFiltrados}
            chaveDe={(c) => c.id}
            aoClicar={setCliente}
            ordenacaoInicial={{ chave: 'nome', direcao: 'asc' }}
            vazio={<Vazio icone={Building2} titulo="Nenhum cliente encontrado" />}
          />
        </Secao>
      )}

      {aba === 'propostas' && (
        <Secao semPadding>
          <Tabela
            colunas={[
              { chave: 'numero', titulo: 'Proposta', valor: (o) => o.numero, render: (o) => <span className="num text-xs font-medium">{o.numero}</span> },
              { chave: 'cliente', titulo: 'Cliente', render: (o) => <span className="truncate text-xs">{clientePorId.get(o.clienteId)?.nomeFantasia}</span> },
              { chave: 'escopo', titulo: 'Escopo', secundaria: true, render: (o) => <span className="truncate text-xs text-muted-foreground">{o.itens[0]?.descricao}</span> },
              { chave: 'qtd', titulo: 'Qtd.', alinhamento: 'direita', secundaria: true, render: (o) => <span className="num text-xs">{o.itens[0]?.quantidade}</span> },
              { chave: 'total', titulo: 'Valor', alinhamento: 'direita', valor: (o) => o.total, render: (o) => <span className="num text-xs font-medium">{moeda(o.total)}</span> },
              { chave: 'desconto', titulo: 'Desc.', alinhamento: 'direita', secundaria: true, render: (o) => <span className="num text-xs text-muted-foreground">{o.desconto}%</span> },
              {
                chave: 'status', titulo: 'Status', valor: (o) => o.status,
                render: (o) => (
                  <Pilula
                    tom={o.status === 'aprovado' ? 'sucesso' : o.status === 'recusado' ? 'erro' : o.status === 'enviado' ? 'info' : 'neutro'}
                    className="px-1.5 py-0 text-[0.62rem]"
                  >
                    {o.status}
                  </Pilula>
                ),
              },
              { chave: 'validade', titulo: 'Válida até', alinhamento: 'direita', valor: (o) => o.validoAte, render: (o) => <span className="num text-xs text-muted-foreground">{fData(o.validoAte)}</span> },
            ]}
            dados={estado.orcamentos}
            chaveDe={(o) => o.id}
            ordenacaoInicial={{ chave: 'total', direcao: 'desc' }}
          />
        </Secao>
      )}

      <FichaCliente cliente={cliente} aoFechar={() => setCliente(null)} />
    </>
  );
}

/* ---------------- Cartão do funil ---------------- */

function CartaoOportunidade({
  oportunidade, podeMover, aoMover,
}: { oportunidade: Oportunidade; podeMover: boolean; aoMover: (e: EstagioFunil) => void }) {
  const { clientePorId, usuarioPorId } = useIndices();
  const cliente = clientePorId.get(oportunidade.clienteId);

  const cartao = (
    <div className="panel-sunken w-full p-3 text-left transition-colors hover:bg-[hsl(var(--surface-raised))]">
      <p className="line-clamp-2 text-[0.72rem] font-medium leading-snug text-foreground">
        {oportunidade.titulo}
      </p>
      <p className="mt-1 truncate text-[0.66rem] text-muted-foreground">{cliente?.nomeFantasia}</p>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="num text-[0.7rem] font-semibold text-foreground">{moedaCompacta(oportunidade.valor)}</span>
        <span className="num text-[0.62rem] text-muted-foreground">{oportunidade.probabilidade}%</span>
      </div>
      <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-[hsl(var(--line-soft))]">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${oportunidade.probabilidade}%` }} />
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 text-[0.6rem] text-muted-foreground">
        <CalendarClock className="h-2.5 w-2.5" />
        {fData(oportunidade.previsaoFechamento)}
        <span className="ml-auto truncate">{usuarioPorId.get(oportunidade.responsavelId)?.nome.split(' ')[0]}</span>
      </div>
    </div>
  );

  if (!podeMover) return <li>{cartao}</li>;

  return (
    <li>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="w-full">{cartao}</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuLabel className="label-micro">Mover para</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {FUNIL.filter((f) => f.id !== oportunidade.estagio).map((f) => (
            <DropdownMenuItem key={f.id} onClick={() => aoMover(f.id)} className="gap-2 text-xs">
              <span className="h-2 w-2 rounded-full" style={{ background: `hsl(${f.cor})` }} aria-hidden />
              {f.rotulo}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

/* ---------------- Ficha do cliente ---------------- */

function FichaCliente({ cliente, aoFechar }: { cliente: Cliente | null; aoFechar: () => void }) {
  const { estado } = useBancada();
  const { usuarioPorId } = useIndices();

  const dados = useMemo(() => {
    if (!cliente) return null;
    const amostras = estado.amostras.filter((a) => a.clienteId === cliente.id);
    const titulos = estado.titulos.filter((t) => t.clienteId === cliente.id);
    return {
      amostras,
      laudos: estado.laudos.filter((l) => l.clienteId === cliente.id),
      contatos: estado.contatos.filter((c) => c.clienteId === cliente.id),
      interacoes: estado.interacoes.filter((i) => i.clienteId === cliente.id)
        .sort((a, b) => +new Date(b.data) - +new Date(a.data)),
      oportunidades: estado.oportunidades.filter((o) => o.clienteId === cliente.id),
      aberto: titulos.filter((t) => t.status === 'aberto' || t.status === 'vencido')
        .reduce((s, t) => s + t.valor - t.valorPago, 0),
      faturado: titulos.filter((t) => t.tipo === 'receber').reduce((s, t) => s + t.valor, 0),
    };
  }, [cliente, estado]);

  if (!cliente || !dados) return null;
  const tabela = estado.tabelasPreco.find((t) => t.id === cliente.tabelaPrecoId);

  return (
    <Sheet open onOpenChange={(a) => { if (!a) aoFechar(); }}>
      <SheetContent className="bancada w-full overflow-hidden border-l border-[hsl(var(--line-soft))] bg-background p-0 sm:max-w-2xl">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader className="space-y-2 text-left">
              <Pilula tom={cliente.ativo ? 'sucesso' : 'neutro'} pontinho>
                {cliente.ativo ? 'Cliente ativo' : 'Inativo'}
              </Pilula>
              <SheetTitle className="font-display text-3xl leading-tight tracking-tight">{cliente.nome}</SheetTitle>
              <SheetDescription className="num text-sm">{mascaraDocumento(cliente.documento)}</SheetDescription>
            </SheetHeader>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <Indicador rotulo="Amostras" valor={dados.amostras.length} />
              <Indicador rotulo="Faturado" valor={moedaCompacta(dados.faturado)} />
              <Indicador rotulo="Em aberto" valor={moedaCompacta(dados.aberto)} destaque={dados.aberto > 0} />
            </div>

            <div className="mt-5 panel p-5">
              <Campos
                itens={[
                  { rotulo: 'Segmento', valor: cliente.segmento },
                  { rotulo: 'Praça', valor: `${cliente.municipio}/${cliente.uf}` },
                  { rotulo: 'E-mail', valor: cliente.email },
                  { rotulo: 'Telefone', valor: <span className="num">{cliente.telefone}</span> },
                  { rotulo: 'Tabela de preço', valor: `${tabela?.nome} (−${tabela?.desconto}%)` },
                  { rotulo: 'Condição', valor: cliente.condicaoPagamento },
                  { rotulo: 'Limite de crédito', valor: <span className="num">{moeda(cliente.limiteCredito)}</span> },
                  { rotulo: 'Consultor', valor: cliente.consultorId ? usuarioPorId.get(cliente.consultorId)?.nome ?? '—' : '—' },
                ]}
              />
              {cliente.observacoes && (
                <p className="mt-4 border-t border-[hsl(var(--line-soft))] pt-4 text-xs leading-relaxed text-muted-foreground">
                  {cliente.observacoes}
                </p>
              )}
            </div>

            {dados.contatos.length > 0 && (
              <div className="mt-5">
                <h3 className="label-micro mb-3">Contatos</h3>
                <ul className="space-y-2">
                  {dados.contatos.map((c) => (
                    <li key={c.id} className="panel flex items-center gap-3 p-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-xs font-medium text-foreground">
                          {c.nome}
                          {c.principal && <Pilula tom="primario" className="px-1.5 py-0 text-[0.56rem]">principal</Pilula>}
                        </p>
                        <p className="truncate text-[0.68rem] text-muted-foreground">{c.cargo}</p>
                      </div>
                      <a href={`mailto:${c.email}`} className="text-muted-foreground transition-colors hover:text-primary" aria-label={`E-mail de ${c.nome}`}>
                        <Mail className="h-3.5 w-3.5" />
                      </a>
                      <a href={`tel:${c.telefone}`} className="text-muted-foreground transition-colors hover:text-primary" aria-label={`Telefone de ${c.nome}`}>
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {dados.oportunidades.length > 0 && (
              <div className="mt-5">
                <h3 className="label-micro mb-3">Oportunidades</h3>
                <ul className="space-y-2">
                  {dados.oportunidades.map((o) => (
                    <li key={o.id} className="panel flex items-center justify-between gap-3 p-3.5">
                      <div className="min-w-0">
                        <p className="truncate text-xs text-foreground">{o.titulo}</p>
                        <p className="text-[0.66rem] text-muted-foreground">{FUNIL.find((f) => f.id === o.estagio)?.rotulo} · {o.probabilidade}%</p>
                      </div>
                      <span className="num shrink-0 text-xs font-medium text-foreground">{moedaCompacta(o.valor)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {dados.interacoes.length > 0 && (
              <div className="mt-5">
                <h3 className="label-micro mb-3">Histórico de relacionamento</h3>
                <ol className="relative space-y-4 border-l border-[hsl(var(--line-soft))] pl-5">
                  {dados.interacoes.slice(0, 10).map((i) => (
                    <li key={i.id} className="relative">
                      <span className="absolute -left-[1.625rem] top-1 h-2 w-2 rounded-full bg-primary" aria-hidden />
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-xs capitalize text-foreground">{i.tipo}</p>
                        <span className="shrink-0 text-[0.66rem] text-muted-foreground">{tempoRelativo(i.data)}</span>
                      </div>
                      <p className="mt-0.5 text-[0.7rem] leading-relaxed text-muted-foreground">{i.resumo}</p>
                      <p className="mt-0.5 text-[0.64rem] text-muted-foreground/70">{usuarioPorId.get(i.autorId)?.nome}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <Button variant="outline" className={cn('gap-2')} onClick={() => toast.info('Abrindo composição de e-mail…')}>
                <Mail className="h-4 w-4" /> Contatar
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
