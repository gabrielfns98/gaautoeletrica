/* ============================================================
   BANCADA — estoque de reagentes, padrões e consumíveis
   ============================================================ */

import { useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Boxes, FlaskRound, ShieldAlert, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useAcoes, useBancada, useIndices } from '../data/store';
import { data as fData, dataHora, diasAte, moeda, moedaCompacta, numero, tempoRelativo } from '../lib/format';
import {
  BarraFiltros, CabecalhoPagina, Indicador, Pilula, Secao, Segmentos, Tabela, Vazio, filtrar,
} from '../components/primitivos';
import type { ItemEstoque, LoteReagente, MovimentoEstoque } from '../types';

type Aba = 'itens' | 'lotes' | 'movimentos';

export default function Estoque() {
  const { estado, pode } = useBancada();
  const { movimentarEstoque } = useAcoes();
  const { usuarioPorId } = useIndices();

  const [aba, setAba] = useState<Aba>('itens');
  const [busca, setBusca] = useState('');
  const [itemId, setItemId] = useState(estado.itensEstoque[0]?.id ?? '');
  const [tipo, setTipo] = useState<MovimentoEstoque['tipo']>('saida');
  const [quantidade, setQuantidade] = useState('1');
  const [motivo, setMotivo] = useState('Consumo em bancada de acidez');

  const itemPorId = useMemo(
    () => new Map(estado.itensEstoque.map((i) => [i.id, i])),
    [estado.itensEstoque],
  );

  const kpis = useMemo(() => {
    const abaixoMinimo = estado.itensEstoque.filter((i) => i.saldo < i.estoqueMinimo);
    const vencidos = estado.lotesReagente.filter((l) => diasAte(l.validade) < 0);
    const vencendo = estado.lotesReagente.filter((l) => {
      const d = diasAte(l.validade);
      return d >= 0 && d <= 60;
    });
    return {
      valor: estado.itensEstoque.reduce((s, i) => s + i.saldo * i.custoUnitario, 0),
      abaixoMinimo,
      vencidos,
      vencendo,
      controlados: estado.itensEstoque.filter((i) => i.controlado).length,
    };
  }, [estado.itensEstoque, estado.lotesReagente]);

  const registrar = () => {
    const q = Number(quantidade.replace(',', '.'));
    if (!Number.isFinite(q) || q <= 0) {
      toast.error('Informe uma quantidade válida.');
      return;
    }
    const item = itemPorId.get(itemId);
    if (!item) return;
    if (tipo !== 'entrada' && q > item.saldo) {
      toast.error('Saldo insuficiente', { description: `Disponível: ${numero(item.saldo, 2)} ${item.unidadeMedida}.` });
      return;
    }
    movimentarEstoque(itemId, tipo, q, motivo);
    setQuantidade('1');
    toast.success('Movimento registrado', {
      description: `${tipo} de ${numero(q, 2)} ${item.unidadeMedida} — ${item.nome}.`,
    });
  };

  return (
    <>
      <CabecalhoPagina
        eyebrow="Recursos"
        titulo="Estoque"
        descricao="Reagentes, padrões rastreáveis e consumíveis, com controle de lote, validade e produtos de uso controlado."
      >
        <div className="mt-6">
          <Segmentos
            valor={aba}
            aoMudar={setAba}
            opcoes={[
              { valor: 'itens', rotulo: 'Itens', contagem: estado.itensEstoque.length },
              { valor: 'lotes', rotulo: 'Lotes', contagem: estado.lotesReagente.length },
              { valor: 'movimentos', rotulo: 'Movimentos', contagem: estado.movimentosEstoque.length },
            ]}
          />
        </div>
      </CabecalhoPagina>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador rotulo="Valor imobilizado" valor={moedaCompacta(kpis.valor)} icone={Boxes} />
        <Indicador rotulo="Abaixo do mínimo" valor={kpis.abaixoMinimo.length} destaque={kpis.abaixoMinimo.length > 0} detalhe="itens para repor" icone={TriangleAlert} />
        <Indicador rotulo="Lotes vencendo" valor={kpis.vencendo.length} detalhe={`${kpis.vencidos.length} já vencidos`} />
        <Indicador rotulo="Produtos controlados" valor={kpis.controlados} detalhe="sujeitos a mapa PF/Exército" icone={ShieldAlert} />
      </div>

      {kpis.abaixoMinimo.length > 0 && (
        <div className="animate-rise mb-5 rounded-[var(--radius-lg)] border border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning)/0.08)] px-5 py-4">
          <div className="flex items-start gap-2.5">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Reposição necessária</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {kpis.abaixoMinimo.map((i) => `${i.nome} (${numero(i.saldo, 1)} de ${numero(i.estoqueMinimo, 1)} ${i.unidadeMedida})`).join(' · ')}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          {aba === 'itens' && (
            <Secao semPadding>
              <div className="px-5 pt-5">
                <BarraFiltros busca={busca} aoBuscar={setBusca} placeholder="Buscar por nome, código ou fabricante…" />
              </div>
              <Tabela
                colunas={[
                  { chave: 'codigo', titulo: 'Código', valor: (i) => i.codigo, render: (i) => <span className="num text-xs text-muted-foreground">{i.codigo}</span> },
                  {
                    chave: 'nome', titulo: 'Item', valor: (i) => i.nome,
                    render: (i) => (
                      <span className="block min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-xs font-medium text-foreground">{i.nome}</span>
                          {i.controlado && <Pilula tom="erro" className="shrink-0 px-1.5 py-0 text-[0.56rem]">controlado</Pilula>}
                        </span>
                        <span className="block truncate text-[0.66rem] text-muted-foreground">{i.fabricante} · {i.localizacao}</span>
                      </span>
                    ),
                  },
                  { chave: 'classe', titulo: 'Classe', secundaria: true, render: (i) => <span className="text-xs capitalize text-muted-foreground">{i.classe}</span> },
                  {
                    chave: 'saldo', titulo: 'Saldo', alinhamento: 'direita', valor: (i) => i.saldo,
                    render: (i) => {
                      const baixo = i.saldo < i.estoqueMinimo;
                      return (
                        <span className="block">
                          <span className={cn('num text-xs font-medium', baixo && 'text-destructive')}>
                            {numero(i.saldo, 2)} {i.unidadeMedida}
                          </span>
                          <span className="num block text-[0.64rem] text-muted-foreground">mín. {numero(i.estoqueMinimo, 0)}</span>
                        </span>
                      );
                    },
                  },
                  {
                    chave: 'nivel', titulo: 'Nível', largura: '7rem',
                    render: (i) => {
                      const pct = Math.min(100, (i.saldo / Math.max(i.estoqueMinimo * 2, 1)) * 100);
                      const baixo = i.saldo < i.estoqueMinimo;
                      return (
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[hsl(var(--surface-sunken))]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: baixo ? 'hsl(var(--destructive))' : 'hsl(var(--success))' }}
                          />
                        </div>
                      );
                    },
                  },
                  { chave: 'custo', titulo: 'Custo total', alinhamento: 'direita', secundaria: true, valor: (i) => i.saldo * i.custoUnitario, render: (i) => <span className="num text-xs text-muted-foreground">{moeda(i.saldo * i.custoUnitario)}</span> },
                ]}
                dados={filtrar(estado.itensEstoque, busca, (i) => [i.nome, i.codigo, i.fabricante, i.classe])}
                chaveDe={(i) => i.id}
                ordenacaoInicial={{ chave: 'nome', direcao: 'asc' }}
                vazio={<Vazio icone={Boxes} titulo="Nenhum item encontrado" />}
              />
            </Secao>
          )}

          {aba === 'lotes' && (
            <Secao semPadding>
              <Tabela
                colunas={[
                  { chave: 'lote', titulo: 'Lote', valor: (l) => l.lote, render: (l) => <span className="num text-xs font-medium">{l.lote}</span> },
                  { chave: 'item', titulo: 'Item', render: (l) => <span className="truncate text-xs">{itemPorId.get(l.itemId)?.nome}</span> },
                  { chave: 'qtd', titulo: 'Quantidade', alinhamento: 'direita', valor: (l) => l.quantidade, render: (l) => <span className="num text-xs">{numero(l.quantidade, 2)} {itemPorId.get(l.itemId)?.unidadeMedida}</span> },
                  {
                    chave: 'validade', titulo: 'Validade', alinhamento: 'direita', valor: (l) => l.validade,
                    render: (l) => {
                      const d = diasAte(l.validade);
                      return (
                        <span className={cn('num text-xs', d < 0 ? 'text-destructive' : d <= 60 ? 'text-[hsl(var(--warning))]' : 'text-muted-foreground')}>
                          {fData(l.validade)}
                        </span>
                      );
                    },
                  },
                  {
                    chave: 'situacao', titulo: 'Situação', alinhamento: 'direita',
                    render: (l) => {
                      const d = diasAte(l.validade);
                      return (
                        <Pilula tom={d < 0 ? 'erro' : d <= 60 ? 'alerta' : 'sucesso'} className="px-1.5 py-0 text-[0.62rem]">
                          {d < 0 ? 'vencido' : d <= 60 ? `vence em ${d} d` : 'válido'}
                        </Pilula>
                      );
                    },
                  },
                  { chave: 'aberto', titulo: 'Frasco', alinhamento: 'direita', secundaria: true, render: (l) => <span className="text-xs text-muted-foreground">{l.aberto ? `aberto ${tempoRelativo(l.abertoEm ?? l.validade)}` : 'lacrado'}</span> },
                ]}
                dados={estado.lotesReagente}
                chaveDe={(l) => l.id}
                ordenacaoInicial={{ chave: 'validade', direcao: 'asc' }}
              />
            </Secao>
          )}

          {aba === 'movimentos' && (
            <Secao semPadding>
              <Tabela
                denso
                colunas={[
                  { chave: 'data', titulo: 'Data', valor: (m) => m.data, render: (m) => <span className="num text-xs text-muted-foreground">{dataHora(m.data)}</span> },
                  { chave: 'item', titulo: 'Item', render: (m) => <span className="truncate text-xs">{itemPorId.get(m.itemId)?.nome}</span> },
                  {
                    chave: 'tipo', titulo: 'Tipo',
                    render: (m) => (
                      <Pilula
                        tom={m.tipo === 'entrada' ? 'sucesso' : m.tipo === 'descarte' ? 'erro' : m.tipo === 'ajuste' ? 'alerta' : 'info'}
                        className="px-1.5 py-0 text-[0.62rem]"
                      >
                        {m.tipo}
                      </Pilula>
                    ),
                  },
                  {
                    chave: 'qtd', titulo: 'Quantidade', alinhamento: 'direita', valor: (m) => m.quantidade,
                    render: (m) => (
                      <span className={cn('num text-xs', m.tipo === 'entrada' ? 'text-[hsl(var(--success))]' : 'text-foreground')}>
                        {m.tipo === 'entrada' ? '+' : '−'}{numero(m.quantidade, 2)} {itemPorId.get(m.itemId)?.unidadeMedida}
                      </span>
                    ),
                  },
                  { chave: 'usuario', titulo: 'Responsável', secundaria: true, render: (m) => <span className="text-xs text-muted-foreground">{usuarioPorId.get(m.usuarioId)?.nome.split(' ')[0]}</span> },
                  { chave: 'motivo', titulo: 'Motivo', render: (m) => <span className="truncate text-xs text-muted-foreground">{m.motivo}</span> },
                ]}
                dados={[...estado.movimentosEstoque].sort((a, b) => +new Date(b.data) - +new Date(a.data)).slice(0, 60)}
                chaveDe={(m) => m.id}
              />
            </Secao>
          )}
        </div>

        <div className="space-y-5">
          {pode('estoque:editar') && (
            <Secao titulo="Lançar movimento">
              <div className="space-y-4">
                <div>
                  <Label className="label-micro mb-2 block">Item</Label>
                  <Select value={itemId} onValueChange={setItemId}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {estado.itensEstoque.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          <span className="num mr-2 text-[0.65rem] text-muted-foreground">{i.codigo}</span>{i.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {itemPorId.get(itemId) && (
                    <p className="num mt-2 text-xs text-muted-foreground">
                      saldo atual {numero(itemPorId.get(itemId)!.saldo, 2)} {itemPorId.get(itemId)!.unidadeMedida}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="label-micro mb-2 block">Tipo</Label>
                  <Select value={tipo} onValueChange={(v) => setTipo(v as MovimentoEstoque['tipo'])}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="saida">Saída — consumo</SelectItem>
                      <SelectItem value="entrada">Entrada — compra</SelectItem>
                      <SelectItem value="ajuste">Ajuste de inventário</SelectItem>
                      <SelectItem value="descarte">Descarte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="label-micro mb-2 block" htmlFor="qtd-mov">Quantidade</Label>
                  <Input id="qtd-mov" inputMode="decimal" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="num h-9" />
                </div>

                <div>
                  <Label className="label-micro mb-2 block" htmlFor="motivo-mov">Motivo</Label>
                  <Input id="motivo-mov" value={motivo} onChange={(e) => setMotivo(e.target.value)} className="h-9" />
                </div>

                <Button onClick={registrar} className="w-full gap-2">
                  {tipo === 'entrada' ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
                  Registrar
                </Button>
              </div>
            </Secao>
          )}

          <Secao titulo="Tampões de pH" descricao="Insumo crítico da bancada de acidez">
            <ul className="space-y-3">
              {estado.itensEstoque.filter((i) => i.classe === 'tampao').map((i) => {
                const baixo = i.saldo < i.estoqueMinimo;
                return (
                  <li key={i.id} className="panel-sunken p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">{i.nome}</p>
                        <p className="num mt-0.5 text-[0.66rem] text-muted-foreground">{i.fabricante}</p>
                      </div>
                      <FlaskRound className={cn('h-4 w-4 shrink-0', baixo ? 'text-destructive' : 'text-primary')} />
                    </div>
                    <div className="mt-2.5 flex items-baseline justify-between">
                      <span className={cn('num text-sm font-semibold', baixo && 'text-destructive')}>
                        {numero(i.saldo, 1)} {i.unidadeMedida}
                      </span>
                      <span className="num text-[0.64rem] text-muted-foreground">mín. {numero(i.estoqueMinimo, 0)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Secao>
        </div>
      </div>
    </>
  );
}
