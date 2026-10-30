/* ============================================================
   BANCADA — cadastros
   O miolo configurável do laboratório. Cada item aqui é algo que
   muda de cliente para cliente e não pode viver no código.
   ============================================================ */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Layers, Pencil, Plus, Sigma, SlidersHorizontal, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { useAcoes, useBancada, useIndices } from '../../data/store';
import { Formulario, PainelRegistro, novoId } from '../../components/editor';
import { data as fData, moeda, numero } from '../../lib/format';
import { CabecalhoPagina, Pilula, Secao, Tabela, Vazio } from '../../components/primitivos';
import type { TomStatus } from '../../components/primitivos';
import type {
  Bandeja, Convenio, ItemSimples, Legenda, Metodologia, Parametro,
  RegraDesconto, SeveridadeFaixa, TipoAnalise, ColecaoCadastro, FaixaLegenda,
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
          {aberto === 'profundidades' && (
            <Simples titulo="Profundidade" colecao="profundidades" prefixo="prf"
              descricao="Camadas que a recepção oferece na entrada da amostra"
              itens={estado.profundidades} />
          )}
          {aberto === 'culturas' && (
            <Simples titulo="Cultura" colecao="culturas" prefixo="cul"
              descricao="Culturas usadas na interpretação e no laudo"
              itens={estado.culturas} />
          )}
          {aberto === 'tipos-cliente' && (
            <Simples titulo="Tipo de Cliente" colecao="tiposCliente" prefixo="tpc"
              itens={estado.tiposCliente} />
          )}
          {aberto === 'convenios' && <Convenios />}
          {aberto === 'descontos' && <Descontos />}
          {aberto === 'observacoes' && (
            <Simples titulo="Observação Fixa" colecao="observacoesFixas" prefixo="obs" textoLongo
              descricao="Textos padrão que o laudo oferece na emissão"
              itens={estado.observacoesFixas} />
          )}
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
  const { estado, pode } = useBancada();
  const { parametroPorId } = useIndices();
  const { salvarLegenda } = useAcoes();
  const [abertaId, setAbertaId] = useState(estado.legendas[0]?.id ?? '');
  const [editando, setEditando] = useState<Legenda | null>(null);
  const legenda = estado.legendas.find((l) => l.id === abertaId);
  const podeEditar = pode('configuracoes:editar');

  const nova = (): Legenda => ({
    id: novoId('lgd'), codigo: '', nome: '',
    parametroId: estado.parametros[0]?.id ?? '', fonte: '',
    faixas: [
      { ate: 0, rotulo: 'Baixo', severidade: 'critico' },
      { de: 0, rotulo: 'Adequado', severidade: 'ideal' },
    ],
    padrao: false, ativa: true,
  });

  const editor = (
    <EditorLegenda
      legenda={editando}
      aoFechar={() => setEditando(null)}
      aoSalvar={(l) => { salvarLegenda(l); setAbertaId(l.id); setEditando(null); }}
    />
  );

  if (!legenda) {
    return (
      <Secao
        acoes={podeEditar ? (
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setEditando(nova())}>
            <Plus className="h-3.5 w-3.5" /> Nova
          </Button>
        ) : undefined}
      >
        <Vazio icone={Layers} titulo="Nenhuma legenda cadastrada" />
        {editor}
      </Secao>
    );
  }

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
      {editor}

      <Secao
        titulo="Legendas"
        descricao="Faixas de interpretação por elemento, cultura e tabela de referência"
        semPadding
        acoes={podeEditar ? (
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setEditando(nova())}>
            <Plus className="h-3.5 w-3.5" /> Nova
          </Button>
        ) : undefined}
      >
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

      <Secao
        titulo={legenda.nome}
        descricao={`${param?.nome}${legenda.cultura ? ` · ${legenda.cultura}` : ''} · fonte: ${legenda.fonte}`}
        acoes={podeEditar ? (
          <Button
            variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
            onClick={() => setEditando({ ...legenda })}
          >
            <Pencil className="h-3.5 w-3.5" /> Editar faixas
          </Button>
        ) : undefined}
      >
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
  const { salvarCadastro } = useAcoes();

  return (
    <PainelRegistro
      titulo="Tipo de Análise"
      descricao="O pacote que o cliente contrata — nome, prazo, preço e os elementos que o compõem"
      itens={estado.tiposAnalise}
      larguraDialogo="sm:max-w-3xl"
      colunas={[
        { chave: 'codigo', titulo: 'Código', valor: (t: TipoAnalise) => t.codigo,
          render: (t) => <span className="num text-xs font-medium">{t.codigo}</span> },
        { chave: 'nome', titulo: 'Nome', render: (t) => <span className="text-xs">{t.nome}</span> },
        { chave: 'grupo', titulo: 'Análise',
          render: (t) => <span className="text-xs uppercase text-muted-foreground">{grupoPorId.get(t.grupoId)?.nome}</span> },
        { chave: 'qtd', titulo: 'Elementos', alinhamento: 'direita', valor: (t) => t.parametroIds.length,
          render: (t) => <span className="num text-xs">{t.parametroIds.length}</span> },
        { chave: 'prazo', titulo: 'Prazo', alinhamento: 'direita',
          render: (t) => <span className="num text-xs text-muted-foreground">{t.prazoDias} d</span> },
        { chave: 'preco', titulo: 'Valor', alinhamento: 'direita',
          render: (t) => {
            const soma = t.parametroIds.reduce((acc, id) => acc + (parametroPorId.get(id)?.preco ?? 0), 0);
            return (
              <span className="num text-xs">
                {moeda(t.preco ?? soma)}
                {t.preco === undefined && <span className="ml-1 text-[0.6rem] text-muted-foreground">soma</span>}
              </span>
            );
          } },
        { chave: 'ativo', titulo: '', alinhamento: 'direita',
          render: (t) => !t.ativo && <Pilula tom="neutro" className="px-1.5 py-0 text-[0.62rem]">inativo</Pilula> },
      ]}
      campos={[
        { tipo: 'texto', chave: 'codigo', rotulo: 'Código' },
        { tipo: 'texto', chave: 'nome', rotulo: 'Nome' },
        { tipo: 'selecao', chave: 'grupoId', rotulo: 'Análise',
          opcoes: estado.grupos.map((g) => ({ valor: g.id, rotulo: g.nome })) },
        { tipo: 'numero', chave: 'prazoDias', rotulo: 'Prazo', min: 1, sufixo: 'dias' },
        { tipo: 'numero', chave: 'preco', rotulo: 'Preço do pacote', passo: 0.01, min: 0, sufixo: 'R$' },
      ]}
      extraFormulario={(rascunho, aoMudar) => (
        <SeletorElementos
          grupoId={rascunho.grupoId}
          selecionados={rascunho.parametroIds}
          aoMudar={(ids) => aoMudar({ ...rascunho, parametroIds: ids })}
        />
      )}
      validar={(t) => (
        !t.codigo.trim() ? 'O código identifica o pacote na planilha e no laudo.'
        : !t.nome.trim() ? 'Dê um nome ao pacote.'
        : t.parametroIds.length === 0 ? 'Escolha pelo menos um elemento.'
        : undefined
      )}
      criar={() => ({
        id: novoId('tpa'), codigo: '', nome: '', grupoId: estado.grupos[0]?.id ?? 'solo',
        parametroIds: [], prazoDias: 7, preco: undefined, ativo: true,
      })}
      aoSalvar={(t) => salvarCadastro('tiposAnalise', t, `${t.codigo} — ${t.nome}`)}
      ativoDe={(t) => t.ativo}
      alternarAtivo={(t) => ({ ...t, ativo: !t.ativo })}
      rotuloDe={(t) => t.nome}
      camposBusca={(t) => [t.codigo, t.nome]}
    />
  );
}

/** Montagem do pacote: quais elementos entram e em que ordem saem no laudo. */
function SeletorElementos({ grupoId, selecionados, aoMudar }: {
  grupoId: string; selecionados: string[]; aoMudar: (ids: string[]) => void;
}) {
  const { estado } = useBancada();
  const doGrupo = estado.parametros.filter((p) => p.grupoId === grupoId && p.ativo);
  const soma = selecionados.reduce(
    (acc, id) => acc + (estado.parametros.find((p) => p.id === id)?.preco ?? 0), 0);

  const alternar = (id: string) => {
    aoMudar(selecionados.includes(id) ? selecionados.filter((x) => x !== id) : [...selecionados, id]);
  };

  return (
    <div className="sm:col-span-2">
      <div className="mb-2 flex items-baseline justify-between">
        <Label className="text-xs text-muted-foreground">Elementos do pacote</Label>
        <span className="num text-[0.68rem] text-muted-foreground">
          {selecionados.length} selecionados · soma {moeda(soma)}
        </span>
      </div>

      {doGrupo.length === 0 ? (
        <p className="rounded-[var(--radius)] border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
          Esta análise ainda não tem elemento cadastrado.
        </p>
      ) : (
        <div className="grid max-h-64 grid-cols-2 gap-1 overflow-y-auto rounded-[var(--radius)] border border-border p-2 sm:grid-cols-3">
          {doGrupo.map((p) => {
            const dentro = selecionados.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => alternar(p.id)}
                aria-pressed={dentro}
                className={cn(
                  'flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-xs transition-colors',
                  dentro ? 'bg-primary/15 text-foreground' : 'text-muted-foreground hover:bg-[hsl(var(--surface-raised))]',
                )}
              >
                <span className={cn('num shrink-0 text-[0.62rem]', dentro ? 'text-primary' : 'opacity-60')}>
                  {p.codigo}
                </span>
                <span className="truncate">{p.nome}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Elementos() {
  const { estado } = useBancada();
  const { grupoPorId } = useIndices();
  const { salvarCadastro } = useAcoes();

  return (
    <PainelRegistro
      titulo="Elemento"
      descricao="O analito individual: unidade, casas decimais, método, incerteza e preço"
      itens={estado.parametros}
      larguraDialogo="sm:max-w-2xl"
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
          render: (p) => <span className="text-[0.68rem] uppercase text-muted-foreground">{grupoPorId.get(p.grupoId)?.abreviacao}</span> },
        { chave: 'unidade', titulo: 'Unidade',
          render: (p) => <span className="num text-xs text-muted-foreground">{p.unidade || '—'}</span> },
        { chave: 'metodo', titulo: 'Método', secundaria: true,
          render: (p) => <span className="truncate text-[0.68rem] text-muted-foreground">{p.metodo}</span> },
        { chave: 'preco', titulo: 'Preço', alinhamento: 'direita', valor: (p) => p.preco,
          render: (p) => <span className="num text-xs">{p.preco > 0 ? moeda(p.preco) : 'calculado'}</span> },
        { chave: 'ativo', titulo: '', alinhamento: 'direita',
          render: (p) => !p.ativo && <Pilula tom="neutro" className="px-1.5 py-0 text-[0.62rem]">inativo</Pilula> },
      ]}
      campos={[
        { tipo: 'texto', chave: 'codigo', rotulo: 'Código', dica: 'É por ele que a planilha do instrumento casa a coluna.' },
        { tipo: 'texto', chave: 'nome', rotulo: 'Nome' },
        { tipo: 'selecao', chave: 'grupoId', rotulo: 'Análise',
          opcoes: estado.grupos.map((g) => ({ valor: g.id, rotulo: g.nome })) },
        { tipo: 'texto', chave: 'unidade', rotulo: 'Unidade', dica: 'Vazio para adimensional, como pH.' },
        { tipo: 'texto', chave: 'metodo', rotulo: 'Método', largura: 2 },
        { tipo: 'numero', chave: 'casasDecimais', rotulo: 'Casas decimais', min: 0, max: 6 },
        { tipo: 'numero', chave: 'preco', rotulo: 'Preço', passo: 0.01, min: 0, sufixo: 'R$' },
        { tipo: 'numero', chave: 'limiteInferior', rotulo: 'Limite inferior do método', passo: 0.01 },
        { tipo: 'numero', chave: 'limiteSuperior', rotulo: 'Limite superior do método', passo: 0.01 },
        { tipo: 'numero', chave: 'incerteza', rotulo: 'Incerteza expandida', passo: 0.001, min: 0 },
        { tipo: 'selecao', chave: 'extrator', rotulo: 'Extrator (potenciometria)',
          opcoes: [
            { valor: 'H2O', rotulo: 'Água' }, { valor: 'CaCl2', rotulo: 'CaCl₂ 0,01 mol/L' },
            { valor: 'KCl', rotulo: 'KCl 1 mol/L' }, { valor: 'SMP', rotulo: 'Tampão SMP' },
            { valor: 'direto', rotulo: 'Leitura direta' },
          ] },
        { tipo: 'booleano', chave: 'ehPh', rotulo: 'Resolvido na bancada de potenciometria',
          dica: 'Marcado, o elemento entra na fila da bancada e exige calibração válida.' },
      ]}
      validar={(p) => (
        !p.codigo.trim() ? 'O código é a chave que casa a planilha com o elemento.'
        : !p.nome.trim() ? 'Dê um nome ao elemento.'
        : !p.metodo.trim() ? 'O método sai no laudo; informe qual é.'
        : p.ehPh && !p.extrator ? 'Elemento de potenciometria precisa do extrator.'
        : p.limiteInferior !== undefined && p.limiteSuperior !== undefined && p.limiteInferior >= p.limiteSuperior
          ? 'O limite inferior tem de ser menor que o superior.'
        : undefined
      )}
      criar={() => ({
        id: novoId('par'), codigo: '', nome: '', grupoId: estado.grupos[0]?.id ?? 'solo',
        unidade: '', tipo: 'numerico' as const, metodo: '', casasDecimais: 2, preco: 0, ativo: true,
      })}
      aoSalvar={(p) => salvarCadastro('parametros', p, `${p.codigo} — ${p.nome}`)}
      ativoDe={(p) => p.ativo}
      alternarAtivo={(p) => ({ ...p, ativo: !p.ativo })}
      rotuloDe={(p) => p.nome}
      camposBusca={(p) => [p.codigo, p.nome, p.metodo]}
    />
  );
}

function Metodologias() {
  const { estado } = useBancada();
  const { salvarCadastro } = useAcoes();

  return (
    <PainelRegistro
      titulo="Metodologia"
      descricao="Procedimentos vigentes, com norma de referência e versão"
      itens={estado.metodologias}
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
        { chave: 'ativa', titulo: '', alinhamento: 'direita',
          render: (m) => !m.ativa && <Pilula tom="neutro" className="px-1.5 py-0 text-[0.62rem]">inativa</Pilula> },
      ]}
      campos={[
        { tipo: 'texto', chave: 'codigo', rotulo: 'Código do POP' },
        { tipo: 'texto', chave: 'nome', rotulo: 'Procedimento' },
        { tipo: 'texto', chave: 'norma', rotulo: 'Norma de referência', largura: 2 },
        { tipo: 'texto', chave: 'versao', rotulo: 'Versão' },
        { tipo: 'texto', chave: 'vigenteDesde', rotulo: 'Vigente desde', dica: 'aaaa-mm-dd' },
      ]}
      validar={(m) => (!m.codigo.trim() || !m.nome.trim() ? 'Código e procedimento são obrigatórios.' : undefined)}
      criar={() => ({
        id: novoId('met'), codigo: '', nome: '', norma: '', versao: '1',
        vigenteDesde: new Date().toISOString().slice(0, 10), ativa: true,
      })}
      aoSalvar={(m) => salvarCadastro('metodologias', m, `${m.codigo} — ${m.nome}`)}
      ativoDe={(m) => m.ativa}
      alternarAtivo={(m) => ({ ...m, ativa: !m.ativa })}
      rotuloDe={(m) => m.nome}
      camposBusca={(m) => [m.codigo, m.nome, m.norma]}
    />
  );
}

function Bandejas() {
  const { estado } = useBancada();
  const { salvarCadastro } = useAcoes();

  return (
    <PainelRegistro
      titulo="Bandeja"
      descricao="Posições da bancada para rastrear onde cada amostra está"
      itens={estado.bandejas}
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
          render: (b) => !b.ativa && <Pilula tom="neutro" className="px-1.5 py-0 text-[0.62rem]">inativa</Pilula> },
      ]}
      campos={[
        { tipo: 'texto', chave: 'codigo', rotulo: 'Código' },
        { tipo: 'texto', chave: 'nome', rotulo: 'Bandeja' },
        { tipo: 'texto', chave: 'setor', rotulo: 'Setor' },
        { tipo: 'numero', chave: 'linhas', rotulo: 'Linhas', min: 1 },
        { tipo: 'numero', chave: 'colunas', rotulo: 'Colunas', min: 1 },
      ]}
      validar={(b) => (b.linhas < 1 || b.colunas < 1 ? 'A grade precisa de pelo menos uma linha e uma coluna.' : undefined)}
      criar={() => ({ id: novoId('ban'), codigo: '', nome: '', linhas: 8, colunas: 12, setor: '', ativa: true })}
      aoSalvar={(b) => salvarCadastro('bandejas', b, `${b.codigo} — ${b.nome}`)}
      ativoDe={(b) => b.ativa}
      alternarAtivo={(b) => ({ ...b, ativa: !b.ativa })}
      rotuloDe={(b) => b.nome}
      camposBusca={(b) => [b.codigo, b.nome, b.setor]}
    />
  );
}

/* ---------------- Comercial e documentos ---------------- */

function Convenios() {
  const { estado } = useBancada();
  const { salvarCadastro } = useAcoes();

  return (
    <PainelRegistro
      titulo="Convênio"
      descricao="Acordos com desconto próprio"
      itens={estado.convenios}
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
          render: (c) => !c.ativo && <Pilula tom="neutro" className="px-1.5 py-0 text-[0.62rem]">encerrado</Pilula> },
      ]}
      campos={[
        { tipo: 'texto', chave: 'codigo', rotulo: 'Código' },
        { tipo: 'texto', chave: 'nome', rotulo: 'Convênio' },
        { tipo: 'selecao', chave: 'tabelaPrecoId', rotulo: 'Tabela de preço',
          opcoes: estado.tabelasPreco.map((t) => ({ valor: t.id, rotulo: t.nome })) },
        { tipo: 'numero', chave: 'desconto', rotulo: 'Desconto', min: 0, max: 100, sufixo: '%' },
        { tipo: 'texto', chave: 'validoAte', rotulo: 'Válido até', dica: 'aaaa-mm-dd; vazio para sem prazo' },
      ]}
      validar={(c) => (c.desconto < 0 || c.desconto > 100 ? 'O desconto vai de 0 a 100%.' : undefined)}
      criar={() => ({ id: novoId('cnv'), codigo: '', nome: '', desconto: 0, ativo: true })}
      aoSalvar={(c) => salvarCadastro('convenios', c, `${c.codigo} — ${c.nome}`)}
      ativoDe={(c) => c.ativo}
      alternarAtivo={(c) => ({ ...c, ativo: !c.ativo })}
      rotuloDe={(c) => c.nome}
      camposBusca={(c) => [c.codigo, c.nome]}
    />
  );
}

function Descontos() {
  const { estado } = useBancada();
  const { salvarCadastro } = useAcoes();

  return (
    <PainelRegistro
      titulo="Desconto"
      descricao="Faixas por volume de amostras no lote"
      itens={estado.regrasDesconto}
      colunas={[
        { chave: 'codigo', titulo: 'Código', valor: (d: RegraDesconto) => d.codigo,
          render: (d) => <span className="num text-xs font-medium">{d.codigo}</span> },
        { chave: 'nome', titulo: 'Regra', render: (d) => <span className="text-xs">{d.nome}</span> },
        { chave: 'minimo', titulo: 'A partir de', alinhamento: 'direita', valor: (d) => d.quantidadeMinima,
          render: (d) => <span className="num text-xs">{numero(d.quantidadeMinima, 0)} amostras</span> },
        { chave: 'percentual', titulo: 'Desconto', alinhamento: 'direita', valor: (d) => d.percentual,
          render: (d) => <span className="num text-xs font-medium text-primary">{numero(d.percentual, 0)}%</span> },
        { chave: 'ativo', titulo: '', alinhamento: 'direita',
          render: (d) => !d.ativo && <Pilula tom="neutro" className="px-1.5 py-0 text-[0.62rem]">inativa</Pilula> },
      ]}
      campos={[
        { tipo: 'texto', chave: 'codigo', rotulo: 'Código' },
        { tipo: 'texto', chave: 'nome', rotulo: 'Regra' },
        { tipo: 'numero', chave: 'quantidadeMinima', rotulo: 'A partir de', min: 1, sufixo: 'amostras' },
        { tipo: 'numero', chave: 'percentual', rotulo: 'Desconto', min: 0, max: 100, sufixo: '%' },
      ]}
      validar={(d) => (d.quantidadeMinima < 1 ? 'A faixa começa em pelo menos uma amostra.' : undefined)}
      criar={() => ({ id: novoId('dsc'), codigo: '', nome: '', quantidadeMinima: 10, percentual: 5, ativo: true })}
      aoSalvar={(d) => salvarCadastro('regrasDesconto', d, `${d.codigo} — ${d.nome}`)}
      ativoDe={(d) => d.ativo}
      alternarAtivo={(d) => ({ ...d, ativo: !d.ativo })}
      rotuloDe={(d) => d.nome}
      camposBusca={(d) => [d.codigo, d.nome]}
    />
  );
}

/** Lista de uma coluna só: profundidade, cultura, tipo de cliente, observação fixa. */
function Simples({ titulo, descricao, itens, colecao, prefixo, textoLongo }: {
  titulo: string; descricao?: string; itens: ItemSimples[];
  colecao: ColecaoCadastro; prefixo: string; textoLongo?: boolean;
}) {
  const { salvarCadastro } = useAcoes();

  return (
    <PainelRegistro
      titulo={titulo}
      descricao={descricao ?? `${itens.length} registros`}
      itens={itens}
      colunas={[
        { chave: 'codigo', titulo: 'Código', valor: (i: ItemSimples) => i.codigo,
          render: (i) => <span className="num text-xs font-medium">{i.codigo}</span> },
        { chave: 'nome', titulo: 'Descrição', valor: (i) => i.nome,
          render: (i) => <span className={cn('text-xs', textoLongo && 'whitespace-normal')}>{i.nome}</span> },
        { chave: 'obs', titulo: 'Observação', secundaria: true,
          render: (i) => <span className="text-xs text-muted-foreground">{i.observacao ?? '—'}</span> },
        { chave: 'ativo', titulo: '', alinhamento: 'direita',
          render: (i) => !i.ativo && <Pilula tom="neutro" className="px-1.5 py-0 text-[0.62rem]">inativo</Pilula> },
      ]}
      campos={[
        { tipo: 'texto', chave: 'codigo', rotulo: 'Código' },
        ...(textoLongo
          ? [{ tipo: 'area' as const, chave: 'nome' as const, rotulo: 'Texto' }]
          : [{ tipo: 'texto' as const, chave: 'nome' as const, rotulo: 'Descrição' }]),
        { tipo: 'texto', chave: 'observacao', rotulo: 'Observação', largura: 2 },
      ]}
      validar={(i) => (!i.nome.trim() ? 'Preencha a descrição.' : undefined)}
      criar={() => ({ id: novoId(prefixo), codigo: '', nome: '', ativo: true })}
      aoSalvar={(i) => salvarCadastro(colecao, i, i.nome)}
      ativoDe={(i) => i.ativo}
      alternarAtivo={(i) => ({ ...i, ativo: !i.ativo })}
      rotuloDe={(i) => i.nome}
      camposBusca={(i) => [i.codigo, i.nome, i.observacao]}
    />
  );
}

/**
 * Edição de legenda: metadados e as faixas. A faixa de baixo não tem
 * piso e a de cima não tem teto — é assim que uma tabela de
 * interpretação funciona, e é assim que ela é editada aqui.
 */
function EditorLegenda({ legenda, aoFechar, aoSalvar }: {
  legenda: Legenda | null; aoFechar: () => void; aoSalvar: (l: Legenda) => void;
}) {
  const { estado } = useBancada();
  const [rascunho, setRascunho] = useState<Legenda | null>(null);
  const atual = rascunho ?? legenda;

  useEffect(() => { setRascunho(legenda); }, [legenda]);
  if (!atual) return null;

  const definirFaixa = (i: number, dados: Partial<FaixaLegenda>) => {
    setRascunho({ ...atual, faixas: atual.faixas.map((f, k) => (k === i ? { ...f, ...dados } : f)) });
  };

  const erro = !atual.codigo.trim() ? 'Dê um código à legenda.'
    : !atual.nome.trim() ? 'Dê um nome à legenda.'
    : !atual.fonte.trim() ? 'Informe a fonte: é ela que responde de onde vem a faixa.'
    : atual.faixas.length === 0 ? 'Uma legenda sem faixa não interpreta nada.'
    : atual.faixas.some((f) => !f.rotulo.trim()) ? 'Toda faixa precisa de rótulo.'
    : undefined;

  return (
    <Dialog open onOpenChange={(a) => { if (!a) aoFechar(); }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{legenda?.codigo ? 'Editar legenda' : 'Nova legenda'}</DialogTitle>
          <DialogDescription>
            Cada laboratório adota a sua tabela — 5ª Aproximação, Boletim 100, Embrapa Cerrado —
            e pode manter uma por cultura.
          </DialogDescription>
        </DialogHeader>

        <Formulario
          campos={[
            { tipo: 'texto', chave: 'codigo', rotulo: 'Código' },
            { tipo: 'texto', chave: 'nome', rotulo: 'Nome' },
            { tipo: 'selecao', chave: 'parametroId', rotulo: 'Elemento',
              opcoes: estado.parametros.map((p) => ({ valor: p.id, rotulo: `${p.codigo} — ${p.nome}` })) },
            { tipo: 'texto', chave: 'cultura', rotulo: 'Cultura', dica: 'Vazio vale para qualquer cultura.' },
            { tipo: 'texto', chave: 'fonte', rotulo: 'Fonte', largura: 2 },
            { tipo: 'booleano', chave: 'padrao', rotulo: 'Legenda padrão deste elemento',
              dica: 'É a que o laudo usa quando nenhuma outra se aplica à cultura.' },
          ]}
          valor={atual}
          aoMudar={setRascunho}
          extra={
            <div className="sm:col-span-2">
              <div className="mb-2 flex items-baseline justify-between">
                <Label className="text-xs text-muted-foreground">Faixas</Label>
                <button
                  type="button"
                  className="text-[0.68rem] text-primary hover:underline"
                  onClick={() => setRascunho({
                    ...atual,
                    faixas: [...atual.faixas, { de: 0, rotulo: '', severidade: 'neutro' }],
                  })}
                >
                  adicionar faixa
                </button>
              </div>

              <div className="space-y-1.5">
                {atual.faixas.map((f, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_2fr_1.4fr_auto] items-center gap-1.5">
                    <Input
                      type="number" step="any" className="num h-8 text-xs" placeholder="de"
                      aria-label={`Limite inferior da faixa ${i + 1}`}
                      value={f.de ?? ''}
                      onChange={(e) => definirFaixa(i, { de: e.target.value === '' ? undefined : Number(e.target.value) })}
                    />
                    <Input
                      type="number" step="any" className="num h-8 text-xs" placeholder="até"
                      aria-label={`Limite superior da faixa ${i + 1}`}
                      value={f.ate ?? ''}
                      onChange={(e) => definirFaixa(i, { ate: e.target.value === '' ? undefined : Number(e.target.value) })}
                    />
                    <Input
                      className="h-8 text-xs" placeholder="rótulo"
                      aria-label={`Rótulo da faixa ${i + 1}`}
                      value={f.rotulo}
                      onChange={(e) => definirFaixa(i, { rotulo: e.target.value })}
                    />
                    <Select
                      value={f.severidade}
                      onValueChange={(v) => definirFaixa(i, { severidade: v as FaixaLegenda['severidade'] })}
                    >
                      <SelectTrigger className="h-8 text-xs" aria-label={`Severidade da faixa ${i + 1}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critico">Crítico</SelectItem>
                        <SelectItem value="atencao">Atenção</SelectItem>
                        <SelectItem value="bom">Bom</SelectItem>
                        <SelectItem value="ideal">Ideal</SelectItem>
                        <SelectItem value="neutro">Neutro</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      aria-label={`Remover faixa ${i + 1}`}
                      onClick={() => setRascunho({ ...atual, faixas: atual.faixas.filter((_, k) => k !== i) })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <p className="mt-2 text-[0.68rem] text-muted-foreground">
                Deixe "de" vazio na primeira faixa e "até" vazio na última: são as pontas abertas.
              </p>
            </div>
          }
        />

        {erro && (
          <p role="alert" className="rounded-[var(--radius-sm)] bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {erro}
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={aoFechar}>Cancelar</Button>
          <Button disabled={Boolean(erro)} onClick={() => aoSalvar(atual)}>Salvar legenda</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
