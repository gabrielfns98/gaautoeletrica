/* ============================================================
   BANCADA — configurações do laboratório
   ============================================================ */

import { useState } from 'react';
import { Building2, Moon, Palette, Sun } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { PainelRegistro, novoId } from '../components/editor';
import { useAcoes, useBancada, useIndices } from '../data/store';
import { classificarPh } from '../lib/ph';
import { moeda, numero } from '../lib/format';
import {
  BarraFiltros, CabecalhoPagina, Campos, Pilula, Secao, Segmentos, Tabela, filtrar,
} from '../components/primitivos';
import { ReguaPh } from '../components/ph-visual';
import type { CriterioAceitacao, GrupoAnalise, Parametro } from '../types';

type Aba = 'unidade' | 'grupos' | 'parametros' | 'criterios' | 'aparencia';

export default function Configuracoes() {
  const { estado, unidade, tema, alternarTema } = useBancada();
  const [aba, setAba] = useState<Aba>('unidade');
  const [busca, setBusca] = useState('');
  const [phExemplo, setPhExemplo] = useState(5.4);

  return (
    <>
      <CabecalhoPagina
        eyebrow="Sistema"
        titulo="Configurações"
        descricao="Dados da unidade acreditada, catálogo de ensaios, critérios metrológicos e aparência da interface."
      >
        <div className="mt-6">
          <Segmentos
            valor={aba}
            aoMudar={setAba}
            opcoes={[
              { valor: 'unidade', rotulo: 'Unidade' },
              { valor: 'grupos', rotulo: 'Grupos de análise', contagem: estado.grupos.length },
              { valor: 'parametros', rotulo: 'Parâmetros', contagem: estado.parametros.length },
              { valor: 'criterios', rotulo: 'Critérios de aceitação' },
              { valor: 'aparencia', rotulo: 'Aparência' },
            ]}
          />
        </div>
      </CabecalhoPagina>

      {aba === 'unidade' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Secao titulo="Identificação" descricao="Dados impressos no cabeçalho dos laudos">
            <Campos
              colunas={2}
              itens={[
                { rotulo: 'Código', valor: <span className="num">{unidade.codigo}</span> },
                { rotulo: 'Sigla', valor: unidade.sigla },
                { rotulo: 'Razão social', valor: unidade.nome },
                { rotulo: 'CNPJ', valor: <span className="num">{unidade.cnpj}</span> },
                { rotulo: 'Município', valor: `${unidade.municipio}/${unidade.uf}` },
                { rotulo: 'Responsável técnico', valor: unidade.responsavelTecnico },
                { rotulo: 'Registro no conselho', valor: <span className="num">{unidade.crq}</span> },
                { rotulo: 'Acreditação', valor: unidade.acreditacao ?? '—' },
              ]}
            />
          </Secao>

          <Secao titulo="Unidades cadastradas" semPadding>
            <ul className="divide-y divide-[hsl(var(--line-soft))]">
              {estado.unidades.map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-5 py-4">
                  <span className="num flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/15 text-xs font-semibold text-primary">
                    {u.codigo}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{u.sigla} — {u.nome}</p>
                    <p className="num truncate text-[0.68rem] text-muted-foreground">
                      {u.cnpj} · {u.municipio}/{u.uf}
                    </p>
                  </div>
                  {u.id === unidade.id && <Pilula tom="primario" className="px-1.5 py-0 text-[0.6rem]">ativa</Pilula>}
                </li>
              ))}
            </ul>
            <div className="border-t border-[hsl(var(--line-soft))] px-5 py-4">
              <p className="flex items-start gap-2 text-[0.7rem] leading-relaxed text-muted-foreground">
                <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                A unidade ativa define a numeração de protocolo, o CNPJ da NFS-e e quais pHmetros aparecem
                na bancada. Troque pelo seletor no rodapé da barra lateral.
              </p>
            </div>
          </Secao>
        </div>
      )}

      {aba === 'grupos' && (
        <Secao semPadding>
          <Tabela
            colunas={[
              { chave: 'abrev', titulo: 'Sigla', render: (g) => <span className="num text-xs text-muted-foreground">{g.abreviacao}</span> },
              {
                chave: 'nome', titulo: 'Grupo', valor: (g) => g.nome,
                render: (g) => (
                  <span className="block min-w-0">
                    <span className="block truncate text-xs font-medium uppercase text-foreground">{g.nome}</span>
                    <span className="block truncate text-[0.66rem] text-muted-foreground">{g.descricao}</span>
                  </span>
                ),
              },
              {
                chave: 'parametros', titulo: 'Ensaios', alinhamento: 'direita',
                valor: (g) => estado.parametros.filter((p) => p.grupoId === g.id).length,
                render: (g) => <span className="num text-xs">{estado.parametros.filter((p) => p.grupoId === g.id).length}</span>,
              },
              {
                chave: 'amostras', titulo: 'Amostras', alinhamento: 'direita', secundaria: true,
                valor: (g) => estado.amostras.filter((a) => a.grupoId === g.id).length,
                render: (g) => <span className="num text-xs text-muted-foreground">{estado.amostras.filter((a) => a.grupoId === g.id).length}</span>,
              },
              { chave: 'prazo', titulo: 'Prazo', alinhamento: 'direita', valor: (g) => g.prazoPadraoDias, render: (g) => <span className="num text-xs text-muted-foreground">{g.prazoPadraoDias} dias</span> },
              {
                chave: 'ph', titulo: 'pH', alinhamento: 'centro',
                render: (g) => g.temPh ? <Pilula tom="primario" className="px-1.5 py-0 text-[0.58rem]">sim</Pilula> : <span className="text-xs text-muted-foreground">—</span>,
              },
              {
                chave: 'ativo', titulo: '', alinhamento: 'direita',
                render: (g) => (
                  <Pilula tom={g.ativo ? 'sucesso' : 'neutro'} className="px-1.5 py-0 text-[0.62rem]">
                    {g.ativo ? 'ativo' : 'inativo'}
                  </Pilula>
                ),
              },
            ]}
            dados={estado.grupos}
            chaveDe={(g) => g.id}
            ordenacaoInicial={{ chave: 'nome', direcao: 'asc' }}
          />
        </Secao>
      )}

      {aba === 'parametros' && (
        <Secao semPadding>
          <div className="px-5 pt-5">
            <BarraFiltros busca={busca} aoBuscar={setBusca} placeholder="Buscar por nome, código ou método…" />
          </div>
          <Tabela
            denso
            colunas={[
              { chave: 'codigo', titulo: 'Código', valor: (p) => p.codigo, render: (p) => <span className="num text-xs text-muted-foreground">{p.codigo}</span> },
              {
                chave: 'nome', titulo: 'Parâmetro', valor: (p) => p.nome,
                render: (p) => (
                  <span className="flex items-center gap-2">
                    <span className="truncate text-xs font-medium text-foreground">{p.nome}</span>
                    {p.ehPh && <Pilula tom="primario" className="shrink-0 px-1.5 py-0 text-[0.56rem]">pH</Pilula>}
                  </span>
                ),
              },
              { chave: 'grupo', titulo: 'Grupo', secundaria: true, render: (p) => <span className="text-xs text-muted-foreground">{estado.grupos.find((g) => g.id === p.grupoId)?.nome}</span> },
              { chave: 'metodo', titulo: 'Método', render: (p) => <span className="truncate text-[0.68rem] text-muted-foreground">{p.metodo}</span> },
              { chave: 'unidade', titulo: 'Unidade', alinhamento: 'centro', render: (p) => <span className="num text-xs text-muted-foreground">{p.unidade || '—'}</span> },
              { chave: 'incerteza', titulo: 'Incerteza', alinhamento: 'direita', secundaria: true, render: (p) => <span className="num text-xs text-muted-foreground">{p.incerteza !== undefined ? `±${numero(p.incerteza, 2)}` : '—'}</span> },
              { chave: 'preco', titulo: 'Preço', alinhamento: 'direita', valor: (p) => p.preco, render: (p) => <span className="num text-xs">{p.preco > 0 ? moeda(p.preco) : 'calculado'}</span> },
            ]}
            dados={filtrar(estado.parametros, busca, (p) => [p.nome, p.codigo, p.metodo])}
            chaveDe={(p) => p.id}
            ordenacaoInicial={{ chave: 'codigo', direcao: 'asc' }}
          />
        </Secao>
      )}

      {aba === 'criterios' && (
        <div className="space-y-5">
          <CriteriosAceitacao />

          <Secao titulo="Classificação da acidez" descricao="Simule um valor para conferir a interpretação">
            <div className="space-y-5">
              <div>
                <Label className="label-micro mb-2 block" htmlFor="ph-sim">pH de referência</Label>
                <Input
                  id="ph-sim" type="range" min={3} max={10} step={0.1}
                  value={phExemplo}
                  onChange={(e) => setPhExemplo(Number(e.target.value))}
                  className="h-9 cursor-pointer accent-primary"
                />
                <p className="num mt-2 text-center text-2xl font-semibold text-foreground">
                  {numero(phExemplo, 1)}
                </p>
              </div>

              <ReguaPh valor={phExemplo} extrator="H2O" faixaIdeal={[5.5, 6.0]} />

              <div className="space-y-2.5 border-t border-[hsl(var(--line-soft))] pt-4">
                {(['H2O', 'CaCl2', 'SMP', 'direto'] as const).map((ex) => {
                  const f = classificarPh(phExemplo, ex);
                  const rotuloEx = ex === 'H2O' ? 'Solo em água (CFSEMG)'
                    : ex === 'CaCl2' ? 'Solo em CaCl₂ (Boletim 100)'
                    : ex === 'SMP' ? 'Índice SMP' : 'Água e efluente (CONAMA)';
                  return (
                    <div key={ex} className="panel-sunken p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="label-micro">{rotuloEx}</p>
                        <Pilula
                          tom={f.severidade === 'ideal' ? 'sucesso' : f.severidade === 'critico' ? 'erro' : f.severidade === 'atencao' ? 'alerta' : 'info'}
                          className="px-1.5 py-0 text-[0.6rem]"
                        >
                          {f.rotulo}
                        </Pilula>
                      </div>
                      <p className="mt-1 text-[0.68rem] leading-relaxed text-muted-foreground">{f.descricao}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </Secao>
        </div>
      )}

      {aba === 'aparencia' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Secao titulo="Tema" descricao="A preferência fica salva neste navegador.">
            <div className="grid grid-cols-2 gap-4">
              {(['dark', 'light'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { if (tema !== t) alternarTema(); }}
                  className={cn(
                    'rounded-[var(--radius-lg)] border p-4 text-left transition-all',
                    tema === t ? 'border-primary ring-2 ring-primary/25' : 'border-[hsl(var(--line-soft))] hover:border-[hsl(var(--line-strong))]',
                  )}
                >
                  <div
                    className="mb-3 h-20 w-full rounded-[var(--radius-sm)] border border-[hsl(var(--line-soft))]"
                    style={{ background: t === 'dark' ? 'hsl(222 28% 6%)' : 'hsl(40 24% 96%)' }}
                  >
                    <div className="flex h-full flex-col justify-end gap-1 p-2.5">
                      <span className="block h-1.5 w-3/4 rounded-full" style={{ background: t === 'dark' ? 'hsl(172 66% 46%)' : 'hsl(174 70% 30%)' }} />
                      <span className="block h-1 w-1/2 rounded-full" style={{ background: t === 'dark' ? 'hsl(220 14% 24%)' : 'hsl(38 14% 76%)' }} />
                    </div>
                  </div>
                  <p className="flex items-center gap-2 text-xs font-medium text-foreground">
                    {t === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                    {t === 'dark' ? 'Painel de instrumento' : 'Caderno de bancada'}
                  </p>
                  <p className="mt-0.5 text-[0.68rem] text-muted-foreground">
                    {t === 'dark' ? 'Grafite com contraste alto, pensado para bancada com pouca luz.' : 'Papel quente, confortável sob luz de laboratório.'}
                  </p>
                </button>
              ))}
            </div>
          </Secao>

          <Secao titulo="Escala de pH" descricao="A rampa do indicador universal é a linguagem cromática do sistema.">
            <div className="ph-spectrum h-8 w-full rounded-[var(--radius-sm)]" />
            <div className="mt-2 flex justify-between">
              {Array.from({ length: 15 }, (_, i) => (
                <span key={i} className="num text-[0.6rem] text-muted-foreground">{i}</span>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-5 gap-2">
              {[0, 4, 7, 10, 14].map((n) => (
                <div key={n} className="text-center">
                  <div className="mx-auto mb-1.5 h-8 w-8 rounded-full" style={{ background: `hsl(var(--ph-${n}))` }} />
                  <p className="num text-[0.66rem] text-muted-foreground">pH {n}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 flex items-start gap-2 text-[0.7rem] leading-relaxed text-muted-foreground">
              <Palette className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              O mesmo tom aparece no chip do resultado, na régua da amostra, no mostrador da bancada e no
              histograma do painel — um valor de pH tem sempre a mesma cor em todo o sistema.
            </p>
          </Secao>
        </div>
      )}
    </>
  );
}

/**
 * Critérios de aceitação por ensaio. Sem alvo, o registro vale para
 * qualquer análise; apontando grupo ou elemento, vence o mais
 * específico — é assim que o laboratório aperta o RSD do solo sem
 * mexer no da água.
 */
/** Sentinela do seletor para "sem alvo": o componente não aceita opção vazia. */
const QUALQUER = 'qualquer';

function CriteriosAceitacao() {
  const { estado } = useBancada();
  const { salvarCadastro } = useAcoes();
  const { grupoPorId, parametroPorId } = useIndices();

  const alvo = (c: CriterioAceitacao) =>
    c.parametroId ? parametroPorId.get(c.parametroId)?.codigo ?? 'elemento'
    : c.grupoId ? grupoPorId.get(c.grupoId)?.nome ?? 'análise'
    : c.somentePh ? 'ensaios por eletrodo'
    : 'qualquer ensaio';

  return (
    <PainelRegistro
      titulo="Critérios de aceitação"
      descricao="Aplicados na bancada, na calibração e no controle de qualidade"
      itens={estado.criterios}
      larguraDialogo="sm:max-w-2xl"
      colunas={[
        { chave: 'nome', titulo: 'Critério', valor: (c: CriterioAceitacao) => c.nome,
          render: (c) => <span className="text-xs font-medium">{c.nome}</span> },
        { chave: 'alvo', titulo: 'Vale para',
          render: (c) => <span className="text-xs text-muted-foreground">{alvo(c)}</span> },
        { chave: 'rsd', titulo: 'RSD réplicas', alinhamento: 'direita', valor: (c) => c.rsdMaxPercentual,
          render: (c) => <span className="num text-xs">{numero(c.rsdMaxPercentual, 1)}%</span> },
        { chave: 'dup', titulo: 'Duplicata', alinhamento: 'direita', secundaria: true,
          render: (c) => <span className="num text-xs text-muted-foreground">
            {c.diferencaMaxPercentual ? `${numero(c.diferencaMaxPercentual, 1)}%` : '—'}
          </span> },
        { chave: 'slope', titulo: 'Slope', alinhamento: 'direita', secundaria: true,
          render: (c) => <span className="num text-xs text-muted-foreground">
            {c.slopeMin ? `${c.slopeMin}–${c.slopeMax}%` : '—'}
          </span> },
        { chave: 'ativo', titulo: '', alinhamento: 'direita',
          render: (c) => !c.ativo && <Pilula tom="neutro" className="px-1.5 py-0 text-[0.62rem]">inativo</Pilula> },
      ]}
      campos={[
        { tipo: 'texto', chave: 'nome', rotulo: 'Nome do critério', largura: 2 },
        /* "Qualquer" precisa de um valor próprio: o seletor não aceita
           opção vazia, e vazio aqui significaria alvo em branco. */
        { tipo: 'selecao', chave: 'grupoId', rotulo: 'Análise',
          opcoes: [{ valor: QUALQUER, rotulo: 'Qualquer análise' },
            ...estado.grupos.map((g) => ({ valor: g.id, rotulo: g.nome }))] },
        { tipo: 'selecao', chave: 'parametroId', rotulo: 'Elemento',
          opcoes: [{ valor: QUALQUER, rotulo: 'Qualquer elemento' },
            ...estado.parametros.map((p) => ({ valor: p.id, rotulo: `${p.codigo} — ${p.nome}` }))] },
        { tipo: 'numero', chave: 'rsdMaxPercentual', rotulo: 'RSD máximo entre réplicas', passo: 0.1, min: 0.1, sufixo: '%' },
        { tipo: 'numero', chave: 'diferencaMaxPercentual', rotulo: 'Diferença máxima entre duplicatas', passo: 0.1, min: 0.1, sufixo: '%' },
        { tipo: 'numero', chave: 'zScoreMax', rotulo: 'z máximo no controle', passo: 0.1, min: 0.1 },
        { tipo: 'numero', chave: 'slopeMin', rotulo: 'Slope mínimo', passo: 0.1, sufixo: '%' },
        { tipo: 'numero', chave: 'slopeMax', rotulo: 'Slope máximo', passo: 0.1, sufixo: '%' },
        { tipo: 'numero', chave: 'slopeAlerta', rotulo: 'Slope de alerta', passo: 0.1, sufixo: '%' },
        { tipo: 'numero', chave: 'offsetMaxMv', rotulo: 'Offset máximo', passo: 0.5, min: 0, sufixo: 'mV' },
        { tipo: 'numero', chave: 'r2Min', rotulo: 'R² mínimo da calibração', passo: 0.0001, min: 0, max: 1 },
        { tipo: 'numero', chave: 'derivaMaxMvPorMin', rotulo: 'Deriva máxima', passo: 0.05, min: 0, sufixo: 'mV/min' },
        { tipo: 'numero', chave: 'janelaEstabilidadeS', rotulo: 'Janela de estabilidade', passo: 1, min: 1, sufixo: 's' },
        { tipo: 'booleano', chave: 'somentePh', rotulo: 'Só para ensaio resolvido por eletrodo',
          dica: 'Slope, offset e deriva são do eletrodo; não fazem sentido no espectrofotômetro.' },
      ]}
      validar={(c) => (
        !c.nome.trim() ? 'Dê um nome ao critério.'
        : c.rsdMaxPercentual <= 0 ? 'O RSD máximo precisa ser maior que zero.'
        : c.slopeMin !== undefined && c.slopeMax !== undefined && c.slopeMin >= c.slopeMax
          ? 'O slope mínimo tem de ser menor que o máximo.'
        : undefined
      )}
      criar={() => ({
        id: novoId('crt'), nome: '', rsdMaxPercentual: 5, zScoreMax: 3, ativo: true,
        grupoId: QUALQUER as CriterioAceitacao['grupoId'], parametroId: QUALQUER,
      })}
      aoSalvar={(c) => salvarCadastro('criterios', {
        ...c,
        // "qualquer" é ausência de alvo no modelo
        grupoId: (c.grupoId as string) === QUALQUER ? undefined : c.grupoId,
        parametroId: c.parametroId === QUALQUER ? undefined : c.parametroId,
      }, c.nome)}
      ativoDe={(c) => c.ativo}
      alternarAtivo={(c) => ({ ...c, ativo: !c.ativo })}
      rotuloDe={(c) => c.nome}
      camposBusca={(c) => [c.nome, alvo(c)]}
    />
  );
}
