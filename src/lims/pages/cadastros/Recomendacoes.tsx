/* ============================================================
   BANCADA — tabelas de recomendação

   Duas listas, porque são duas coisas: a publicação que o
   laboratório adota (CFSEMG, Boletim 100, curva SMP) e o que cada
   cultura pede dentro dela.

   Separar importa: trocar o V% alvo da soja é ajuste de rotina;
   trocar o método de calagem é mudar de referência, e muda a dose
   de todas as culturas de uma vez.
   ============================================================ */

import { useMemo, useState } from 'react';
import { Plus, Sprout, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useAcoes, useBancada } from '../../data/store';
import { PainelRegistro, novoId } from '../../components/editor';
import { Pilula, Segmentos } from '../../components/primitivos';
import type {
  DosePorClasse, MetodoCalagem, PontoSmp, RecomendacaoCultura, TabelaRecomendacao,
} from '../../types';

const ROTULO_METODO: Record<MetodoCalagem, string> = {
  'saturacao-bases': 'Saturação por bases',
  'neutralizacao-al': 'Neutralização do alumínio',
  smp: 'Curva SMP',
};

/** Qual alvo cada método consome, para o formulário dizer o que pedir. */
const ALVO_DO_METODO: Record<MetodoCalagem, string> = {
  'saturacao-bases': 'Usa o V% desejado.',
  'neutralizacao-al': 'Usa o coeficiente do Al³⁺ e o Ca+Mg desejado.',
  smp: 'Usa o pH alvo, lido na curva SMP da tabela.',
};

/* ---------------- Escada de doses ---------------- */

/**
 * Editor das classes de teor.
 *
 * A escada é contígua por construção: o teto de uma classe é o piso
 * da seguinte, e só o primeiro piso e o último teto ficam abertos.
 * Editar um limite move os dois lados, senão o laboratório deixa um
 * vão e um resultado no meio dele sai sem dose — sem erro na tela.
 */
function Escada({
  rotulo, unidade, nutriente, classes, aoMudar,
}: {
  rotulo: string;
  unidade: string;
  nutriente: string;
  classes: DosePorClasse[];
  aoMudar: (classes: DosePorClasse[]) => void;
}) {
  const mudarLimite = (i: number, valor: number | undefined) => {
    const copia = classes.map((c) => ({ ...c }));
    copia[i].ate = valor;
    if (copia[i + 1]) copia[i + 1].de = valor;
    aoMudar(copia);
  };

  const mudarDose = (i: number, dose: number) => {
    const copia = classes.map((c) => ({ ...c }));
    copia[i].dose = dose;
    aoMudar(copia);
  };

  const mudarClasse = (i: number, nome: string) => {
    const copia = classes.map((c) => ({ ...c }));
    copia[i].classe = nome;
    aoMudar(copia);
  };

  /* Os rótulos acessíveis carregam o nutriente porque as duas
     escadas usam os mesmos nomes de classe: sem isso existem dois
     controles chamados "Dose da classe Baixo" na mesma tela, e quem
     usa leitor de tela não distingue o fósforo do potássio. */
  if (classes.length === 0) {
    return (
      <div>
        <Label className="text-xs">{rotulo}</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Sem classes cadastradas — esta cultura não recomenda {nutriente}.
        </p>
      </div>
    );
  }

  return (
    <div>
      <Label className="text-xs">{rotulo}</Label>
      <p className="text-[0.68rem] text-muted-foreground">
        Teor no solo em {unidade}; dose em kg/ha. A dose cai conforme o teor sobe.
      </p>
      <div className="mt-2 space-y-1.5">
        {classes.map((c, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
            <Input
              value={c.classe}
              onChange={(e) => mudarClasse(i, e.target.value)}
              className="h-8 text-xs"
              aria-label={`Nome da classe ${i + 1} de ${nutriente}`}
            />
            <div className="flex items-center gap-1 text-[0.68rem] text-muted-foreground">
              <span className="num w-10 text-right">
                {c.de === undefined ? '0' : c.de}
              </span>
              <span>a</span>
              {i === classes.length - 1 ? (
                <span className="num w-14 text-center">+</span>
              ) : (
                <Input
                  type="number" value={c.ate ?? ''}
                  onChange={(e) => mudarLimite(i, e.target.value === '' ? undefined : Number(e.target.value))}
                  className="num h-8 w-14 px-1 text-center text-xs"
                  aria-label={`Limite superior da classe ${c.classe} de ${nutriente}`}
                />
              )}
            </div>
            <Input
              type="number" value={c.dose}
              onChange={(e) => mudarDose(i, Number(e.target.value) || 0)}
              className="num h-8 w-20 text-right text-xs"
              aria-label={`Dose da classe ${c.classe} de ${nutriente}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Curva SMP ---------------- */

/**
 * Editor da curva SMP.
 *
 * Existe porque sem ele o método SMP é escolhível e inconfigurável:
 * o laboratório seleciona "Curva SMP", o formulário recusa salvar
 * por falta de pontos e não há onde digitá-los. Uma tela que oferece
 * uma opção e depois não deixa concluí-la é pior que não oferecer.
 *
 * A curva é tabelada na publicação — não sai de equação —, então o
 * editor é a própria tabela: índice e a dose para cada pH alvo.
 */
function CurvaSmp({
  pontos, aoMudar,
}: { pontos: PontoSmp[]; aoMudar: (p: PontoSmp[]) => void }) {
  const ordenados = [...pontos].sort((a, b) => a.indice - b.indice);

  const mudar = (i: number, campo: keyof PontoSmp, valor: number) => {
    const copia = ordenados.map((p) => ({ ...p }));
    copia[i][campo] = valor;
    aoMudar(copia);
  };

  const remover = (i: number) => aoMudar(ordenados.filter((_, j) => j !== i));

  const acrescentar = () => {
    const ultimo = ordenados[ordenados.length - 1];
    aoMudar([
      ...ordenados,
      {
        indice: ultimo ? Math.round((ultimo.indice + 0.2) * 10) / 10 : 4.4,
        ph55: 0, ph60: 0, ph65: 0,
      },
    ]);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label className="text-xs">Curva SMP</Label>
          <p className="text-[0.68rem] text-muted-foreground">
            t/ha de calcário PRNT 100% por índice. O cálculo interpola entre os pontos.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={acrescentar}>
          <Plus className="h-3 w-3" /> Ponto
        </Button>
      </div>

      {ordenados.length === 0 ? (
        <p className="mt-2 text-xs text-[hsl(var(--warning))]">
          Sem pontos a tabela não recomenda dose nenhuma.
        </p>
      ) : (
        <div className="mt-2 space-y-1">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 text-[0.6rem] uppercase tracking-wide text-muted-foreground">
            <span>Índice</span><span>pH 5,5</span><span>pH 6,0</span><span>pH 6,5</span><span className="w-7" />
          </div>
          {ordenados.map((ponto, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-center gap-2">
              {(['indice', 'ph55', 'ph60', 'ph65'] as const).map((campo) => (
                <Input
                  key={campo}
                  type="number" step={0.1} value={ponto[campo]}
                  onChange={(e) => mudar(i, campo, Number(e.target.value) || 0)}
                  className="num h-8 text-right text-xs"
                  aria-label={`${campo === 'indice' ? 'Índice' : `Dose para pH ${campo.slice(2, 3)},${campo.slice(3)}`} do ponto ${i + 1}`}
                />
              ))}
              <Button
                type="button" variant="ghost" size="icon" className="h-7 w-7"
                aria-label={`Remover o ponto de índice ${ponto.indice}`}
                onClick={() => remover(i)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Tabelas ---------------- */

function Tabelas() {
  const { estado } = useBancada();
  const { salvarCadastro } = useAcoes();

  return (
    <PainelRegistro
      titulo="Tabelas de referência"
      descricao="A publicação que o laboratório adota. A mesma amostra recomendada por duas tabelas dá duas doses, e as duas estão certas na sua região."
      itens={estado.tabelasRecomendacao}
      larguraDialogo="sm:max-w-xl"
      colunas={[
        {
          chave: 'codigo', titulo: 'Código', valor: (t: TabelaRecomendacao) => t.codigo,
          render: (t) => <span className="num text-xs font-medium">{t.codigo}</span>,
        },
        { chave: 'nome', titulo: 'Nome', render: (t) => <span className="text-xs">{t.nome}</span> },
        {
          chave: 'regiao', titulo: 'Região', secundaria: true,
          render: (t) => <span className="text-xs text-muted-foreground">{t.regiao}</span>,
        },
        {
          chave: 'metodo', titulo: 'Método', secundaria: true,
          render: (t) => (
            <span className="text-xs text-muted-foreground">{ROTULO_METODO[t.metodoCalagem]}</span>
          ),
        },
        {
          chave: 'culturas', titulo: 'Culturas', alinhamento: 'direita',
          valor: (t) => estado.recomendacoesCultura.filter((r) => r.tabelaId === t.id).length,
          render: (t) => (
            <span className="num text-xs text-muted-foreground">
              {estado.recomendacoesCultura.filter((r) => r.tabelaId === t.id).length}
            </span>
          ),
        },
        {
          chave: 'ativa', titulo: '', alinhamento: 'direita',
          render: (t) => (
            <div className="flex justify-end gap-1">
              {t.padrao && (
                <Pilula tom="info" className="px-1.5 py-0 text-[0.62rem]">padrão</Pilula>
              )}
              {!t.ativa && (
                <Pilula tom="neutro" className="px-1.5 py-0 text-[0.62rem]">inativa</Pilula>
              )}
            </div>
          ),
        },
      ]}
      campos={[
        { tipo: 'texto', chave: 'codigo', rotulo: 'Código', obrigatorio: true },
        { tipo: 'texto', chave: 'regiao', rotulo: 'Estado ou região', obrigatorio: true },
        { tipo: 'texto', chave: 'nome', rotulo: 'Nome', largura: 2, obrigatorio: true },
        {
          tipo: 'selecao', chave: 'metodoCalagem', rotulo: 'Método de calagem', largura: 2,
          opcoes: (Object.keys(ROTULO_METODO) as MetodoCalagem[])
            .map((m) => ({ valor: m, rotulo: ROTULO_METODO[m] })),
        },
        {
          tipo: 'numero', chave: 'profundidadeIncorporacao',
          rotulo: 'Incorporação pressuposta', min: 5, max: 60, passo: 5, sufixo: 'cm',
        },
        { tipo: 'area', chave: 'fonte', rotulo: 'Publicação, por extenso' },
        { tipo: 'booleano', chave: 'padrao', rotulo: 'Padrão do laboratório' },
        { tipo: 'booleano', chave: 'ativa', rotulo: 'Ativa' },
      ]}
      extraFormulario={(rascunho, aoMudar) => (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {ALVO_DO_METODO[rascunho.metodoCalagem]}
          </p>
          {rascunho.metodoCalagem === 'smp' && (
            <CurvaSmp
              pontos={rascunho.pontosSmp ?? []}
              aoMudar={(pontosSmp) => aoMudar({ ...rascunho, pontosSmp })}
            />
          )}
        </div>
      )}
      validar={(t) => {
        if (!t.codigo.trim()) return 'Dê um código à tabela.';
        if (!t.nome.trim()) return 'Dê um nome à tabela.';
        if (!t.regiao.trim()) return 'Diga a que estado ou região a tabela se aplica.';
        if (!t.fonte.trim()) return 'Cite a publicação: o anexo do laudo a imprime.';
        /* Método SMP sem curva é aceito pelo formulário e não
           recomenda nada depois; dizer agora é mais barato. */
        if (t.metodoCalagem === 'smp' && (t.pontosSmp?.length ?? 0) === 0) {
          return 'A curva SMP é tabelada: sem os pontos, o método não calcula dose.';
        }
        return undefined;
      }}
      criar={() => ({
        id: novoId('trc'),
        codigo: '', nome: '', regiao: '', fonte: '',
        metodoCalagem: 'saturacao-bases' as MetodoCalagem,
        profundidadeIncorporacao: 20,
        padrao: false, ativa: true,
      })}
      aoSalvar={(t) => salvarCadastro('tabelasRecomendacao', t, t.nome)}
      ativoDe={(t) => t.ativa}
      alternarAtivo={(t) => ({ ...t, ativa: !t.ativa })}
      rotuloDe={(t) => t.nome}
      camposBusca={(t) => [t.codigo, t.nome, t.regiao, t.fonte]}
    />
  );
}

/* ---------------- Culturas ---------------- */

function Culturas() {
  const { estado } = useBancada();
  const { salvarCadastro } = useAcoes();

  const tabelaPorId = useMemo(
    () => new Map(estado.tabelasRecomendacao.map((t) => [t.id, t])),
    [estado.tabelasRecomendacao],
  );

  const culturaPorCodigo = useMemo(
    () => new Map(estado.culturas.map((c) => [c.codigo, c])),
    [estado.culturas],
  );

  return (
    <PainelRegistro
      titulo="Alvos por cultura"
      descricao="O que cada cultura pede dentro de uma tabela: o alvo da calagem e as doses de P e K por teor no solo."
      itens={estado.recomendacoesCultura}
      larguraDialogo="sm:max-w-3xl"
      colunas={[
        {
          chave: 'cultura', titulo: 'Cultura',
          valor: (r: RecomendacaoCultura) => r.cultura,
          render: (r) => (
            <span className="text-xs font-medium">
              {culturaPorCodigo.get(r.cultura)?.nome ?? r.cultura}
            </span>
          ),
        },
        {
          chave: 'tabela', titulo: 'Tabela',
          valor: (r) => tabelaPorId.get(r.tabelaId)?.nome ?? '',
          render: (r) => (
            <span className="text-xs text-muted-foreground">
              {tabelaPorId.get(r.tabelaId)?.codigo ?? '—'}
            </span>
          ),
        },
        {
          chave: 'alvo', titulo: 'Alvo da calagem', secundaria: true,
          render: (r) => {
            const metodo = tabelaPorId.get(r.tabelaId)?.metodoCalagem;
            if (metodo === 'saturacao-bases') {
              return <span className="num text-xs">V {r.saturacaoDesejada ?? '—'}%</span>;
            }
            if (metodo === 'neutralizacao-al') {
              return (
                <span className="num text-xs">
                  Y {r.fatorAluminio ?? '—'} · Ca+Mg {r.caMgDesejado ?? '—'}
                </span>
              );
            }
            return <span className="num text-xs">pH {r.phAlvo ?? '—'}</span>;
          },
        },
        {
          chave: 'produtividade', titulo: 'Referência', alinhamento: 'direita', secundaria: true,
          render: (r) => (
            <span className="num text-xs text-muted-foreground">
              {r.produtividadeReferencia
                ? `${r.produtividadeReferencia} ${r.unidadeProdutividade ?? ''}`.trim()
                : '—'}
            </span>
          ),
        },
        {
          chave: 'n', titulo: 'N', alinhamento: 'direita',
          render: (r) => (
            <span className="num text-xs text-muted-foreground">
              {r.nitrogenio === undefined ? '—' : `${r.nitrogenio} kg/ha`}
            </span>
          ),
        },
        {
          chave: 'ativa', titulo: '', alinhamento: 'direita',
          render: (r) => !r.ativa && (
            <Pilula tom="neutro" className="px-1.5 py-0 text-[0.62rem]">inativa</Pilula>
          ),
        },
      ]}
      campos={[
        {
          tipo: 'selecao', chave: 'tabelaId', rotulo: 'Tabela de referência', largura: 2,
          opcoes: estado.tabelasRecomendacao
            .map((t) => ({ valor: t.id, rotulo: `${t.nome} (${t.regiao})` })),
        },
        {
          tipo: 'selecao', chave: 'cultura', rotulo: 'Cultura',
          opcoes: estado.culturas
            .filter((c) => c.ativo)
            .map((c) => ({ valor: c.codigo, rotulo: c.nome })),
        },
        {
          tipo: 'numero', chave: 'nitrogenio', rotulo: 'Nitrogênio',
          min: 0, passo: 10, sufixo: 'kg/ha',
        },
        {
          tipo: 'numero', chave: 'produtividadeReferencia', rotulo: 'Produtividade de referência',
          min: 0, passo: 1,
        },
        { tipo: 'texto', chave: 'unidadeProdutividade', rotulo: 'Unidade (sc/ha, t/ha)' },
        { tipo: 'area', chave: 'observacao', rotulo: 'Observação, impressa no anexo' },
        { tipo: 'booleano', chave: 'ativa', rotulo: 'Ativa' },
      ]}
      extraFormulario={(rascunho, aoMudar) => {
        const metodo = tabelaPorId.get(rascunho.tabelaId)?.metodoCalagem ?? 'saturacao-bases';
        return (
          <div className="space-y-4">
            {/* O alvo pedido é o do método da tabela escolhida: pedir
                os três faria o laboratório preencher dois que não
                entram em conta nenhuma. */}
            <div>
              <Label className="text-xs">Alvo da calagem</Label>
              <p className="text-[0.68rem] text-muted-foreground">{ALVO_DO_METODO[metodo]}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {metodo === 'saturacao-bases' && (
                  <label className="text-xs text-muted-foreground">
                    V% desejado
                    <Input
                      type="number" min={0} max={100}
                      value={rascunho.saturacaoDesejada ?? ''}
                      onChange={(e) => aoMudar({
                        ...rascunho,
                        saturacaoDesejada: e.target.value === '' ? undefined : Number(e.target.value),
                      })}
                      className="num mt-1 h-8 text-xs"
                    />
                  </label>
                )}
                {metodo === 'neutralizacao-al' && (
                  <>
                    <label className="text-xs text-muted-foreground">
                      Coeficiente do Al³⁺ (Y)
                      <Input
                        type="number" min={0} step={0.5}
                        value={rascunho.fatorAluminio ?? ''}
                        onChange={(e) => aoMudar({
                          ...rascunho,
                          fatorAluminio: e.target.value === '' ? undefined : Number(e.target.value),
                        })}
                        className="num mt-1 h-8 text-xs"
                      />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Ca+Mg desejado (cmolc/dm³)
                      <Input
                        type="number" min={0} step={0.5}
                        value={rascunho.caMgDesejado ?? ''}
                        onChange={(e) => aoMudar({
                          ...rascunho,
                          caMgDesejado: e.target.value === '' ? undefined : Number(e.target.value),
                        })}
                        className="num mt-1 h-8 text-xs"
                      />
                    </label>
                  </>
                )}
                {metodo === 'smp' && (
                  <label className="text-xs text-muted-foreground">
                    pH alvo
                    <Input
                      type="number" min={4} max={8} step={0.5}
                      value={rascunho.phAlvo ?? ''}
                      onChange={(e) => aoMudar({
                        ...rascunho,
                        phAlvo: e.target.value === '' ? undefined : Number(e.target.value),
                      })}
                      className="num mt-1 h-8 text-xs"
                    />
                  </label>
                )}
              </div>
            </div>

            <Escada
              rotulo="Fósforo — P₂O₅ por teor de P no solo"
              unidade="mg/dm³" nutriente="fósforo"
              classes={rascunho.fosforo}
              aoMudar={(fosforo) => aoMudar({ ...rascunho, fosforo })}
            />
            <Escada
              rotulo="Potássio — K₂O por teor de K no solo"
              unidade="mg/dm³" nutriente="potássio"
              classes={rascunho.potassio}
              aoMudar={(potassio) => aoMudar({ ...rascunho, potassio })}
            />
          </div>
        );
      }}
      validar={(r) => {
        if (!r.tabelaId) return 'Escolha a tabela de referência.';
        if (!r.cultura) return 'Escolha a cultura.';
        const metodo = tabelaPorId.get(r.tabelaId)?.metodoCalagem;
        if (metodo === 'saturacao-bases' && r.saturacaoDesejada === undefined) {
          return 'O método da saturação por bases precisa do V% desejado.';
        }
        if (metodo === 'neutralizacao-al'
          && (r.fatorAluminio === undefined || r.caMgDesejado === undefined)) {
          return 'O método do alumínio precisa do coeficiente do Al³⁺ e do Ca+Mg desejado.';
        }
        if (metodo === 'smp' && r.phAlvo === undefined) {
          return 'O método SMP precisa do pH alvo.';
        }
        /* Dose crescente com o teor recomendaria adubar o solo rico:
           a escada estaria invertida. */
        for (const [nome, classes] of [['fósforo', r.fosforo], ['potássio', r.potassio]] as const) {
          for (let i = 1; i < classes.length; i += 1) {
            if (classes[i].dose > classes[i - 1].dose) {
              return `Em ${nome}, a classe "${classes[i].classe}" pede mais que a anterior: `
                + 'a dose tem de cair conforme o teor no solo sobe.';
            }
          }
        }
        const duplicada = estado.recomendacoesCultura.find(
          (x) => x.id !== r.id && x.tabelaId === r.tabelaId && x.cultura === r.cultura,
        );
        if (duplicada) return 'Esta cultura já tem alvo nesta tabela.';
        return undefined;
      }}
      criar={() => ({
        id: novoId('rcl'),
        tabelaId: estado.tabelasRecomendacao.find((t) => t.padrao)?.id
          ?? estado.tabelasRecomendacao[0]?.id ?? '',
        cultura: '',
        fosforo: [], potassio: [],
        ativa: true,
      })}
      aoSalvar={(r) => salvarCadastro(
        'recomendacoesCultura', r,
        `${culturaPorCodigo.get(r.cultura)?.nome ?? r.cultura} — ${tabelaPorId.get(r.tabelaId)?.codigo ?? ''}`,
      )}
      ativoDe={(r) => r.ativa}
      alternarAtivo={(r) => ({ ...r, ativa: !r.ativa })}
      rotuloDe={(r) => culturaPorCodigo.get(r.cultura)?.nome ?? r.cultura}
      camposBusca={(r) => [
        r.cultura,
        culturaPorCodigo.get(r.cultura)?.nome,
        tabelaPorId.get(r.tabelaId)?.nome,
        tabelaPorId.get(r.tabelaId)?.codigo,
      ]}
    />
  );
}

/* ---------------- Entrada ---------------- */

export function Recomendacoes() {
  const [aba, setAba] = useState<'tabelas' | 'culturas'>('tabelas');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sprout className="h-3.5 w-3.5" />
          O laudo diz o que o solo tem; a recomendação diz o que fazer. É daqui que ela sai.
        </p>
        <Segmentos
          valor={aba}
          aoMudar={setAba}
          opcoes={[
            { valor: 'tabelas', rotulo: 'Tabelas' },
            { valor: 'culturas', rotulo: 'Alvos por cultura' },
          ]}
        />
      </div>
      {aba === 'tabelas' ? <Tabelas /> : <Culturas />}
    </div>
  );
}
