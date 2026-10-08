/* ============================================================
   BANCADA — configurações do laboratório
   ============================================================ */

import { useState } from 'react';
import { Building2, Moon, Palette, Sun } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useBancada } from '../data/store';
import { CRITERIOS, classificarPh } from '../lib/ph';
import { moeda, numero } from '../lib/format';
import {
  BarraFiltros, CabecalhoPagina, Campos, Pilula, Secao, Segmentos, Tabela, filtrar,
} from '../components/primitivos';
import { ReguaPh } from '../components/ph-visual';
import type { GrupoAnalise, Parametro } from '../types';

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
              { valor: 'criterios', rotulo: 'Critérios de pH' },
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
        <div className="grid gap-5 lg:grid-cols-2">
          <Secao titulo="Critérios metrológicos" descricao="Aplicados automaticamente na bancada e na calibração">
            <dl className="space-y-3.5">
              {[
                ['Slope mínimo aceito', `${CRITERIOS.slopeMin}%`, 'Abaixo disso a calibração é reprovada'],
                ['Slope máximo aceito', `${CRITERIOS.slopeMax}%`, 'Acima sugere tampão trocado'],
                ['Faixa de atenção', `< ${CRITERIOS.slopeAlerta}%`, 'Gera aviso sem reprovar'],
                ['Offset máximo', `±${CRITERIOS.offsetMaxMv} mV`, 'Potencial de assimetria em pH 7'],
                ['Linearidade mínima', `R² ≥ ${CRITERIOS.r2Min}`, 'Exigida a partir de 3 pontos'],
                ['Deriva para estabilidade', `≤ ${CRITERIOS.derivaMaxMvPorMin} mV/min`, 'Critério de captura automática'],
                ['Janela de observação', `${CRITERIOS.janelaEstabilidadeS} s`, 'Tempo mínimo de sinal estável'],
                ['RSD máximo entre réplicas', `${CRITERIOS.rsdMaxPercentual}%`, 'Acima disso exige repetição'],
              ].map(([rotulo, valor, detalhe]) => (
                <div key={rotulo} className="flex items-start justify-between gap-4 border-b border-[hsl(var(--line-soft))] pb-3.5 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <dt className="text-xs font-medium text-foreground">{rotulo}</dt>
                    <dd className="mt-0.5 text-[0.68rem] text-muted-foreground">{detalhe}</dd>
                  </div>
                  <span className="num shrink-0 text-sm font-semibold text-primary">{valor}</span>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[0.68rem] leading-relaxed text-muted-foreground">
              Os valores vivem em <span className="num">CRITERIOS</span>, em <span className="num">src/lims/lib/ph.ts</span>,
              para que uma mudança de política valha ao mesmo tempo na bancada, na calibração e no
              controle de qualidade.
            </p>
          </Secao>

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
