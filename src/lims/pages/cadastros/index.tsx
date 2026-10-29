/* ============================================================
   BANCADA — cadastros
   O miolo configurável do laboratório. Cada item aqui é algo que
   muda de cliente para cliente e não pode viver no código.
   ============================================================ */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Layers, Sigma, SlidersHorizontal } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import { useBancada, useIndices } from '../../data/store';
import { data as fData, moeda, numero } from '../../lib/format';
import { CabecalhoPagina, Pilula, Secao, Tabela, Vazio } from '../../components/primitivos';
import type { TomStatus } from '../../components/primitivos';
import type {
  Bandeja, Convenio, ItemSimples, Legenda, Metodologia, Parametro,
  RegraDesconto, SeveridadeFaixa, TipoAnalise,
} from '../../types';

import Curvas from './Curvas';
import { rota } from '../../base';

type Registro =
  | 'tipos-analise' | 'elementos' | 'curvas' | 'legendas' | 'metodologias'
  | 'bandejas' | 'profundidades' | 'culturas' | 'tipos-cliente'
  | 'convenios' | 'descontos' | 'observacoes';

const GRUPOS_REGISTRO: Array<{ titulo: string; itens: Array<{ id: Registro; rotulo: string }> }> = [
  {
    titulo: 'Catálogo analítico',
    itens: [
      { id: 'tipos-analise', rotulo: 'Tipo de Análise' },
      { id: 'elementos', rotulo: 'Elemento' },
      { id: 'metodologias', rotulo: 'Metodologia' },
      { id: 'curvas', rotulo: 'Curva' },
      { id: 'legendas', rotulo: 'Legenda' },
    ],
  },
  {
    titulo: 'Bancada',
    itens: [
      { id: 'bandejas', rotulo: 'Bandeja' },
      { id: 'profundidades', rotulo: 'Profundidade' },
      { id: 'culturas', rotulo: 'Cultura' },
    ],
  },
  {
    titulo: 'Comercial',
    itens: [
      { id: 'tipos-cliente', rotulo: 'Tipo de Cliente' },
      { id: 'convenios', rotulo: 'Convênio' },
      { id: 'descontos', rotulo: 'Desconto' },
    ],
  },
  {
    titulo: 'Documentos',
    itens: [{ id: 'observacoes', rotulo: 'Observação Fixa' }],
  },
];

/** Cadastros que já têm tela própria em outro módulo. */
const ATALHOS = [
  { rotulo: 'Equipamento', para: rota('/equipamentos') },
  { rotulo: 'Cliente / Fornecedor', para: rota('/crm') },
  { rotulo: 'Análise e Unidade', para: rota('/configuracoes') },
];

export default function Cadastros() {
  const { estado } = useBancada();
  const [aberto, setAberto] = useState<Registro>('curvas');

  const contagem = useMemo<Record<Registro, number>>(() => ({
    'tipos-analise': estado.tiposAnalise.length,
    elementos: estado.parametros.length,
    curvas: estado.curvas.length,
    legendas: estado.legendas.length,
    metodologias: estado.metodologias.length,
    bandejas: estado.bandejas.length,
    profundidades: estado.profundidades.length,
    culturas: estado.culturas.length,
    'tipos-cliente': estado.tiposCliente.length,
    convenios: estado.convenios.length,
    descontos: estado.regrasDesconto.length,
    observacoes: estado.observacoesFixas.length,
  }), [estado]);

  return (
    <>
      <CabecalhoPagina
        eyebrow="Configuração"
        titulo="Cadastros"
        descricao="O que muda de laboratório para laboratório mora aqui: pacotes vendidos, elementos, métodos, curvas analíticas e faixas de interpretação."
      />

      <div className="grid gap-5 xl:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="space-y-5">
          <Secao semPadding>
            <nav className="py-2">
              {GRUPOS_REGISTRO.map((grupo) => (
                <div key={grupo.titulo} className="mb-3 last:mb-0">
                  <p className="label-micro px-4 py-2">{grupo.titulo}</p>
                  <ul>
                    {grupo.itens.map((item) => {
                      const ativo = item.id === aberto;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => setAberto(item.id)}
                            className={cn(
                              'relative flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors',
                              ativo
                                ? 'bg-[hsl(var(--surface-raised))] font-medium text-foreground'
                                : 'text-muted-foreground hover:bg-[hsl(var(--surface-raised)/0.6)] hover:text-foreground',
                            )}
                          >
                            {ativo && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-primary" aria-hidden />}
                            <span className="truncate">{item.rotulo}</span>
                            <span className="num ml-auto text-[0.66rem] opacity-60">{contagem[item.id]}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </Secao>

          <Secao titulo="Em outro módulo">
            <ul className="space-y-1">
              {ATALHOS.map((a) => (
                <li key={a.rotulo}>
                  <Button asChild variant="ghost" size="sm" className="h-8 w-full justify-start gap-2 px-2 text-xs">
                    <Link to={a.para}>
                      <ExternalLink className="h-3.5 w-3.5" /> {a.rotulo}
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </Secao>
        </div>

        <div className="min-w-0">
          {aberto === 'curvas' && <Curvas />}
          {aberto === 'legendas' && <Legendas />}
          {aberto === 'tipos-analise' && <TiposAnalise />}
          {aberto === 'elementos' && <Elementos />}
          {aberto === 'metodologias' && <Metodologias />}
          {aberto === 'bandejas' && <Bandejas />}
          {aberto === 'profundidades' && <Simples titulo="Profundidade" itens={estado.profundidades} />}
          {aberto === 'culturas' && <Simples titulo="Cultura" itens={estado.culturas} />}
          {aberto === 'tipos-cliente' && <Simples titulo="Tipo de Cliente" itens={estado.tiposCliente} />}
          {aberto === 'convenios' && <Convenios />}
          {aberto === 'descontos' && <Descontos />}
          {aberto === 'observacoes' && <Observacoes />}
        </div>
      </div>
    </>
  );
}

/* ---------------- Legenda ---------------- */

const TOM_SEV: Record<SeveridadeFaixa, TomStatus> = {
  critico: 'erro', atencao: 'alerta', bom: 'info', ideal: 'sucesso', neutro: 'neutro',
};
const COR_SEV: Record<SeveridadeFaixa, string> = {
  critico: 'hsl(var(--destructive))',
  atencao: 'hsl(var(--warning))',
  bom: 'hsl(var(--ph-9))',
  ideal: 'hsl(var(--success))',
  neutro: 'hsl(var(--muted-foreground))',
};

function Legendas() {
  const { estado } = useBancada();
  const { parametroPorId } = useIndices();
  const [abertaId, setAbertaId] = useState(estado.legendas[0]?.id ?? '');
  const legenda = estado.legendas.find((l) => l.id === abertaId);

  if (!legenda) return <Secao><Vazio icone={Layers} titulo="Nenhuma legenda cadastrada" /></Secao>;

  const param = parametroPorId.get(legenda.parametroId);
  // a régua precisa de limites finitos para desenhar as faixas abertas das pontas
  const valores = legenda.faixas.flatMap((f) => [f.de, f.ate]).filter((v): v is number => v !== undefined);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const folga = (max - min) * 0.15 || 1;
  const piso = min - folga;
  const teto = max + folga;
  const largura = teto - piso;

  return (
    <div className="space-y-5">
      <Secao titulo="Legendas" descricao="Faixas de interpretação por elemento" semPadding>
        <ul className="divide-y divide-[hsl(var(--line-soft))]">
          {estado.legendas.map((l) => {
            const p = parametroPorId.get(l.parametroId);
            return (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => setAbertaId(l.id)}
                  className={cn(
                    'flex w-full items-center gap-3 px-5 py-3 text-left transition-colors',
                    l.id === abertaId ? 'bg-[hsl(var(--surface-raised))]' : 'hover:bg-[hsl(var(--surface-raised)/0.6)]',
                  )}
                >
                  <span className="num shrink-0 text-xs font-medium text-foreground">{l.codigo}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs text-foreground">{l.nome}</span>
                    <span className="block truncate text-[0.66rem] text-muted-foreground">{p?.nome} · {l.fonte}</span>
                  </span>
                  {l.padrao && <Pilula tom="primario" className="shrink-0 px-1.5 py-0 text-[0.58rem]">padrão</Pilula>}
                  <span className="num shrink-0 text-[0.66rem] text-muted-foreground">{l.faixas.length} faixas</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Secao>

      <Secao titulo={legenda.nome} descricao={`${param?.nome} · fonte: ${legenda.fonte}`}>
        {/* régua contínua das faixas */}
        <div className="mb-6">
          <div className="flex h-7 w-full overflow-hidden rounded-[var(--radius-sm)]">
            {legenda.faixas.map((f, i) => {
              const de = f.de ?? piso;
              const ate = f.ate ?? teto;
              return (
                <div
                  key={i}
                  title={`${f.rotulo}: ${f.de ?? '−∞'} a ${f.ate ?? '+∞'}`}
                  style={{ width: `${((ate - de) / largura) * 100}%`, background: COR_SEV[f.severidade] }}
                  className="flex items-center justify-center opacity-85"
                >
                  <span className="truncate px-1 text-[0.6rem] font-medium text-white mix-blend-luminosity">
                    {f.rotulo}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 flex justify-between">
            {legenda.faixas.map((f, i) => (
              <span key={i} className="num text-[0.6rem] text-muted-foreground">
                {f.de !== undefined ? numero(f.de, f.de % 1 === 0 ? 0 : 1) : ''}
              </span>
            ))}
            <span className="num text-[0.6rem] text-muted-foreground">
              {legenda.faixas[legenda.faixas.length - 1]?.ate !== undefined
                ? numero(legenda.faixas[legenda.faixas.length - 1].ate!, 1) : '+∞'}
            </span>
          </div>
        </div>

        <Tabela
          denso
          colunas={[
            {
              chave: 'faixa', titulo: 'Faixa',
              render: (f: { de?: number; ate?: number }) => (
                <span className="num text-xs">
                  {f.de !== undefined ? numero(f.de, 2) : '−∞'} – {f.ate !== undefined ? numero(f.ate, 2) : '+∞'}
                </span>
              ),
            },
            {
              chave: 'rotulo', titulo: 'Rótulo',
              render: (f) => <span className="text-xs font-medium text-foreground">{f.rotulo}</span>,
            },
            {
              chave: 'descricao', titulo: 'Interpretação',
              render: (f) => <span className="text-xs text-muted-foreground">{f.descricao ?? '—'}</span>,
            },
            {
              chave: 'severidade', titulo: 'Severidade', alinhamento: 'direita',
              render: (f) => (
                <Pilula tom={TOM_SEV[f.severidade]} className="px-1.5 py-0 text-[0.62rem]">
                  {f.severidade}
                </Pilula>
              ),
            },
          ]}
          dados={legenda.faixas}
          chaveDe={(f) => `${f.rotulo}-${f.de ?? 'inf'}`}
        />

        <p className="mt-4 flex items-start gap-2 border-t border-[hsl(var(--line-soft))] pt-4 text-[0.7rem] leading-relaxed text-muted-foreground">
          <SlidersHorizontal className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          O limite inferior é inclusivo e o superior é exclusivo, então faixas vizinhas
          não se sobrepõem nem deixam buraco. Uma legenda com cultura preenchida vence a
          legenda padrão do elemento.
        </p>
      </Secao>
    </div>
  );
}

/* ---------------- Catálogo ---------------- */

function TiposAnalise() {
  const { estado } = useBancada();
  const { grupoPorId, parametroPorId } = useIndices();
  return (
    <Secao titulo="Tipo de Análise" descricao="O pacote que o cliente contrata" semPadding>
      <Tabela
        colunas={[
          { chave: 'codigo', titulo: 'Código', valor: (t: TipoAnalise) => t.codigo,
            render: (t) => <span className="num text-xs font-medium">{t.codigo}</span> },
          { chave: 'nome', titulo: 'Nome', render: (t) => <span className="text-xs">{t.nome}</span> },
          { chave: 'grupo', titulo: 'Análise',
            render: (t) => <span className="text-xs uppercase text-muted-foreground">{grupoPorId.get(t.grupoId)?.nome}</span> },
          { chave: 'elementos', titulo: 'Elementos', secundaria: true,
            render: (t) => (
              <span className="text-[0.68rem] text-muted-foreground">
                {t.parametroIds.map((id) => parametroPorId.get(id)?.codigo).filter(Boolean).join(' · ')}
              </span>
            ) },
          { chave: 'qtd', titulo: 'Qtd.', alinhamento: 'direita', valor: (t) => t.parametroIds.length,
            render: (t) => <span className="num text-xs">{t.parametroIds.length}</span> },
          { chave: 'prazo', titulo: 'Prazo', alinhamento: 'direita',
            render: (t) => <span className="num text-xs text-muted-foreground">{t.prazoDias} d</span> },
          { chave: 'preco', titulo: 'Valor', alinhamento: 'direita',
            render: (t) => {
              const soma = t.parametroIds.reduce((s, id) => s + (parametroPorId.get(id)?.preco ?? 0), 0);
              return <span className="num text-xs">{moeda(t.preco ?? soma)}</span>;
            } },
        ]}
        dados={estado.tiposAnalise}
        chaveDe={(t) => t.id}
        ordenacaoInicial={{ chave: 'codigo', direcao: 'asc' }}
      />
    </Secao>
  );
}

function Elementos() {
  const { estado } = useBancada();
  const { grupoPorId } = useIndices();
  return (
    <Secao titulo="Elemento" descricao="O analito individual" semPadding>
      <Tabela
        denso
        colunas={[
          { chave: 'codigo', titulo: 'Código', valor: (p: Parametro) => p.codigo,
            render: (p) => <span className="num text-xs text-muted-foreground">{p.codigo}</span> },
          { chave: 'nome', titulo: 'Elemento', valor: (p) => p.nome,
            render: (p) => (
              <span className="flex items-center gap-2">
                <span className="truncate text-xs font-medium text-foreground">{p.nome}</span>
                {p.ehPh && <Pilula tom="primario" className="shrink-0 px-1.5 py-0 text-[0.56rem]">pH</Pilula>}
              </span>
            ) },
          { chave: 'grupo', titulo: 'Análise', secundaria: true,
            render: (p) => <span className="text-xs text-muted-foreground">{grupoPorId.get(p.grupoId)?.nome}</span> },
          { chave: 'unidade', titulo: 'Unidade', alinhamento: 'centro',
            render: (p) => <span className="num text-xs text-muted-foreground">{p.unidade || '—'}</span> },
          { chave: 'faixa', titulo: 'Faixa do método', alinhamento: 'direita', secundaria: true,
            render: (p) => (
              <span className="num text-xs text-muted-foreground">
                {p.limiteInferior !== undefined ? `${numero(p.limiteInferior, 1)} – ${numero(p.limiteSuperior ?? 0, 1)}` : '—'}
              </span>
            ) },
          { chave: 'incerteza', titulo: 'Incerteza', alinhamento: 'direita',
            render: (p) => <span className="num text-xs text-muted-foreground">{p.incerteza !== undefined ? `±${numero(p.incerteza, 2)}` : '—'}</span> },
          { chave: 'preco', titulo: 'Preço', alinhamento: 'direita', valor: (p) => p.preco,
            render: (p) => <span className="num text-xs">{p.preco > 0 ? moeda(p.preco) : 'calculado'}</span> },
        ]}
        dados={estado.parametros}
        chaveDe={(p) => p.id}
        ordenacaoInicial={{ chave: 'codigo', direcao: 'asc' }}
      />
    </Secao>
  );
}

function Metodologias() {
  const { estado } = useBancada();
  return (
    <Secao titulo="Metodologia" descricao="Procedimentos vigentes, com versão" semPadding>
      <Tabela
        colunas={[
          { chave: 'codigo', titulo: 'POP', valor: (m: Metodologia) => m.codigo,
            render: (m) => <span className="num text-xs font-medium">{m.codigo}</span> },
          { chave: 'nome', titulo: 'Procedimento', render: (m) => <span className="text-xs">{m.nome}</span> },
          { chave: 'norma', titulo: 'Norma de referência',
            render: (m) => <span className="text-xs text-muted-foreground">{m.norma}</span> },
          { chave: 'versao', titulo: 'Versão', alinhamento: 'centro',
            render: (m) => <span className="num text-xs">{m.versao}</span> },
          { chave: 'desde', titulo: 'Vigente desde', alinhamento: 'direita', valor: (m) => m.vigenteDesde,
            render: (m) => <span className="num text-xs text-muted-foreground">{fData(m.vigenteDesde)}</span> },
        ]}
        dados={estado.metodologias}
        chaveDe={(m) => m.id}
        ordenacaoInicial={{ chave: 'codigo', direcao: 'asc' }}
      />
    </Secao>
  );
}

function Bandejas() {
  const { estado } = useBancada();
  return (
    <Secao titulo="Bandeja" descricao="Posições da bancada para rastrear onde cada amostra está" semPadding>
      <Tabela
        colunas={[
          { chave: 'codigo', titulo: 'Código', valor: (b: Bandeja) => b.codigo,
            render: (b) => <span className="num text-xs font-medium">{b.codigo}</span> },
          { chave: 'nome', titulo: 'Bandeja', render: (b) => <span className="text-xs">{b.nome}</span> },
          { chave: 'setor', titulo: 'Setor', render: (b) => <span className="text-xs text-muted-foreground">{b.setor}</span> },
          { chave: 'grade', titulo: 'Grade', alinhamento: 'centro',
            render: (b) => <span className="num text-xs">{b.linhas} × {b.colunas}</span> },
          { chave: 'posicoes', titulo: 'Posições', alinhamento: 'direita', valor: (b) => b.linhas * b.colunas,
            render: (b) => <span className="num text-xs">{b.linhas * b.colunas}</span> },
          { chave: 'ativa', titulo: '', alinhamento: 'direita',
            render: (b) => (
              <Pilula tom={b.ativa ? 'sucesso' : 'neutro'} className="px-1.5 py-0 text-[0.62rem]">
                {b.ativa ? 'ativa' : 'inativa'}
              </Pilula>
            ) },
        ]}
        dados={estado.bandejas}
        chaveDe={(b) => b.id}
      />
    </Secao>
  );
}

/* ---------------- Comercial e documentos ---------------- */

function Convenios() {
  const { estado } = useBancada();
  return (
    <Secao titulo="Convênio" descricao="Acordos com desconto próprio" semPadding>
      <Tabela
        colunas={[
          { chave: 'codigo', titulo: 'Código', valor: (c: Convenio) => c.codigo,
            render: (c) => <span className="num text-xs font-medium">{c.codigo}</span> },
          { chave: 'nome', titulo: 'Convênio', render: (c) => <span className="text-xs">{c.nome}</span> },
          { chave: 'tabela', titulo: 'Tabela de preço', secundaria: true,
            render: (c) => (
              <span className="text-xs text-muted-foreground">
                {estado.tabelasPreco.find((t) => t.id === c.tabelaPrecoId)?.nome ?? '—'}
              </span>
            ) },
          { chave: 'desconto', titulo: 'Desconto', alinhamento: 'direita', valor: (c) => c.desconto,
            render: (c) => <span className="num text-xs font-medium">{numero(c.desconto, 0)}%</span> },
          { chave: 'validade', titulo: 'Válido até', alinhamento: 'direita',
            render: (c) => <span className="num text-xs text-muted-foreground">{c.validoAte ? fData(c.validoAte) : 'sem prazo'}</span> },
          { chave: 'ativo', titulo: '', alinhamento: 'direita',
            render: (c) => (
              <Pilula tom={c.ativo ? 'sucesso' : 'neutro'} className="px-1.5 py-0 text-[0.62rem]">
                {c.ativo ? 'ativo' : 'encerrado'}
              </Pilula>
            ) },
        ]}
        dados={estado.convenios}
        chaveDe={(c) => c.id}
      />
    </Secao>
  );
}

function Descontos() {
  const { estado } = useBancada();
  return (
    <Secao titulo="Desconto" descricao="Faixas por volume de amostras no lote" semPadding>
      <Tabela
        colunas={[
          { chave: 'codigo', titulo: 'Código', valor: (d: RegraDesconto) => d.codigo,
            render: (d) => <span className="num text-xs font-medium">{d.codigo}</span> },
          { chave: 'nome', titulo: 'Regra', render: (d) => <span className="text-xs">{d.nome}</span> },
          { chave: 'minimo', titulo: 'A partir de', alinhamento: 'direita', valor: (d) => d.quantidadeMinima,
            render: (d) => <span className="num text-xs">{numero(d.quantidadeMinima, 0)} amostras</span> },
          { chave: 'percentual', titulo: 'Desconto', alinhamento: 'direita', valor: (d) => d.percentual,
            render: (d) => <span className="num text-xs font-medium text-primary">{numero(d.percentual, 0)}%</span> },
        ]}
        dados={estado.regrasDesconto}
        chaveDe={(d) => d.id}
        ordenacaoInicial={{ chave: 'minimo', direcao: 'asc' }}
      />
    </Secao>
  );
}

function Observacoes() {
  const { estado } = useBancada();
  return (
    <Secao titulo="Observação Fixa" descricao="Textos padrão disponíveis para o laudo" semPadding>
      <ul className="divide-y divide-[hsl(var(--line-soft))]">
        {estado.observacoesFixas.map((o) => (
          <li key={o.id} className="flex gap-4 px-5 py-4">
            <span className="num shrink-0 text-[0.66rem] text-muted-foreground">{o.codigo}</span>
            <p className="flex-1 text-xs leading-relaxed text-foreground">{o.nome}</p>
            <Pilula tom={o.ativo ? 'sucesso' : 'neutro'} className="shrink-0 px-1.5 py-0 text-[0.58rem]">
              {o.ativo ? 'ativa' : 'inativa'}
            </Pilula>
          </li>
        ))}
      </ul>
    </Secao>
  );
}

function Simples({ titulo, itens }: { titulo: string; itens: ItemSimples[] }) {
  return (
    <Secao titulo={titulo} descricao={`${itens.length} registros`} semPadding>
      <Tabela
        colunas={[
          { chave: 'codigo', titulo: 'Código', valor: (i: ItemSimples) => i.codigo,
            render: (i) => <span className="num text-xs font-medium">{i.codigo}</span> },
          { chave: 'nome', titulo: 'Descrição', valor: (i) => i.nome,
            render: (i) => <span className="text-xs">{i.nome}</span> },
          { chave: 'obs', titulo: 'Observação',
            render: (i) => <span className="text-xs text-muted-foreground">{i.observacao ?? '—'}</span> },
          { chave: 'ativo', titulo: '', alinhamento: 'direita',
            render: (i) => (
              <Pilula tom={i.ativo ? 'sucesso' : 'neutro'} className="px-1.5 py-0 text-[0.62rem]">
                {i.ativo ? 'ativo' : 'inativo'}
              </Pilula>
            ) },
        ]}
        dados={itens}
        chaveDe={(i) => i.id}
        vazio={<Vazio icone={Sigma} titulo="Nenhum registro" />}
      />
    </Secao>
  );
}
