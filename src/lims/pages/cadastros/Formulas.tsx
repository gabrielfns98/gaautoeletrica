/* ============================================================
   BANCADA — fórmulas dos calculados

   A tela existe porque a conta muda de laboratório para laboratório.
   O editor confere a expressão enquanto se digita e mostra o
   resultado sobre uma amostra de teste, para quem está mexendo ver
   o efeito antes de salvar — e não no laudo do cliente.
   ============================================================ */

import { useMemo, useState } from 'react';
import { Calculator, CircleCheck, TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useAcoes, useBancada } from '../../data/store';
import { FUNCOES, calcular, validarFormula } from '../../lib/formula';
import { PainelRegistro, novoId } from '../../components/editor';
import { Pilula } from '../../components/primitivos';
import { numero } from '../../lib/format';
import type { Formula, GrupoAnaliseId } from '../../types';

const QUALQUER = 'qualquer';

export function Formulas() {
  const { estado } = useBancada();
  const { salvarCadastro } = useAcoes();

  const parametroPorId = useMemo(
    () => new Map(estado.parametros.map((p) => [p.id, p])),
    [estado.parametros],
  );

  /* Só parâmetro sem preço é candidato a calculado: quem tem preço é
     ensaio que a bancada executa, não conta sobre outros. */
  const calculaveis = useMemo(
    () => estado.parametros.filter((p) => p.ativo && p.preco === 0),
    [estado.parametros],
  );

  return (
    <PainelRegistro
      titulo="Fórmulas dos calculados"
      descricao="SB, CTC, V%, m%, H+Al pelo SMP: a equação muda de estado para estado, então ela é cadastro."
      itens={estado.formulas}
      larguraDialogo="sm:max-w-2xl"
      colunas={[
        {
          chave: 'alvo', titulo: 'Resultado',
          valor: (f: Formula) => parametroPorId.get(f.parametroId)?.codigo ?? '',
          render: (f) => (
            <span className="num text-xs font-medium">
              {parametroPorId.get(f.parametroId)?.codigo ?? '—'}
            </span>
          ),
        },
        {
          chave: 'expressao', titulo: 'Equação', valor: (f) => f.expressao,
          render: (f) => <span className="num text-xs text-foreground">{f.expressao}</span>,
        },
        {
          chave: 'grupo', titulo: 'Análise', secundaria: true,
          render: (f) => (
            <span className="text-xs text-muted-foreground">
              {f.grupoId && (f.grupoId as string) !== QUALQUER
                ? estado.grupos.find((g) => g.id === f.grupoId)?.nome
                : 'qualquer'}
            </span>
          ),
        },
        {
          chave: 'fonte', titulo: 'Referência', secundaria: true,
          render: (f) => <span className="truncate text-xs text-muted-foreground">{f.fonte ?? '—'}</span>,
        },
        {
          chave: 'ativa', titulo: '', alinhamento: 'direita',
          render: (f) => !f.ativa && (
            <Pilula tom="neutro" className="px-1.5 py-0 text-[0.62rem]">inativa</Pilula>
          ),
        },
      ]}
      campos={[
        {
          tipo: 'selecao', chave: 'parametroId', rotulo: 'Resultado calculado', largura: 2,
          opcoes: calculaveis.map((p) => ({ valor: p.id, rotulo: `${p.codigo} — ${p.nome}` })),
        },
        {
          tipo: 'selecao', chave: 'grupoId', rotulo: 'Vale para a análise',
          opcoes: [
            { valor: QUALQUER, rotulo: 'Qualquer análise' },
            ...estado.grupos.map((g) => ({ valor: g.id, rotulo: g.nome })),
          ],
        },
        { tipo: 'texto', chave: 'fonte', rotulo: 'Referência da equação' },
        { tipo: 'area', chave: 'observacao', rotulo: 'Observação' },
        { tipo: 'booleano', chave: 'ativa', rotulo: 'Ativa' },
      ]}
      extraFormulario={(rascunho, aoMudar) => (
        <EditorExpressao formula={rascunho} aoMudar={aoMudar} />
      )}
      validar={(f) => {
        if (!f.parametroId) return 'Escolha o resultado que esta fórmula calcula.';
        if (!f.expressao.trim()) return 'Escreva a equação.';
        const alvo = parametroPorId.get(f.parametroId);
        const grupo = (f.grupoId && (f.grupoId as string) !== QUALQUER ? f.grupoId : alvo?.grupoId);
        const codigos = estado.parametros
          .filter((p) => !grupo || p.grupoId === grupo)
          .map((p) => p.codigo);
        const r = validarFormula(f.expressao, codigos);
        if (!r.ok) return r.erro;
        /* Fórmula que se usa calcula para sempre: a conta pediria o
           próprio resultado que ainda não existe. */
        if (alvo && r.variaveis.includes(alvo.codigo.toUpperCase())) {
          return `A fórmula de ${alvo.codigo} não pode usar ${alvo.codigo}.`;
        }
        return undefined;
      }}
      criar={() => ({
        id: novoId('frm'),
        parametroId: calculaveis[0]?.id ?? '',
        expressao: '',
        grupoId: QUALQUER as Formula['grupoId'],
        ativa: true,
      })}
      aoSalvar={(f) => salvarCadastro('formulas', {
        ...f,
        grupoId: (f.grupoId as string) === QUALQUER ? undefined : f.grupoId,
      }, parametroPorId.get(f.parametroId)?.codigo ?? f.expressao)}
      ativoDe={(f) => f.ativa}
      alternarAtivo={(f) => ({ ...f, ativa: !f.ativa })}
      rotuloDe={(f) => parametroPorId.get(f.parametroId)?.codigo ?? 'fórmula'}
      camposBusca={(f) => [f.expressao, f.fonte, parametroPorId.get(f.parametroId)?.codigo]}
    />
  );
}

/* ---------------- Editor com conferência ao vivo ---------------- */

function EditorExpressao({
  formula, aoMudar,
}: { formula: Formula; aoMudar: (f: Formula) => void }) {
  const { estado } = useBancada();

  const alvo = estado.parametros.find((p) => p.id === formula.parametroId);
  const grupo = (formula.grupoId ?? alvo?.grupoId) as GrupoAnaliseId | undefined;

  /* As variáveis que a fórmula pode usar são os elementos da mesma
     análise — não faz sentido somar argila com proteína bruta. */
  const disponiveis = useMemo(
    () => estado.parametros.filter((p) => p.ativo && (!grupo || p.grupoId === grupo)),
    [estado.parametros, grupo],
  );

  const conferencia = useMemo(
    () => validarFormula(formula.expressao, disponiveis.map((p) => p.codigo)),
    [formula.expressao, disponiveis],
  );

  /* Valores de ensaio para a simulação: o usuário mexe neles e vê a
     conta rodar, em vez de descobrir o erro num laudo. */
  const [teste, setTeste] = useState<Record<string, string>>({});

  const simulacao = useMemo(() => {
    if (!conferencia.ok) return undefined;
    const vars: Record<string, number | undefined> = {};
    for (const v of conferencia.variaveis) {
      const bruto = (teste[v] ?? '').replace(',', '.');
      vars[v] = bruto.trim() === '' ? undefined : Number(bruto);
    }
    try {
      return calcular(formula.expressao, vars);
    } catch {
      return undefined;
    }
  }, [conferencia, formula.expressao, teste]);

  return (
    <div className="space-y-4">
      <div>
        <Label className="label-micro mb-2 block" htmlFor="frm-expr">Equação</Label>
        <Input
          id="frm-expr"
          value={formula.expressao}
          onChange={(e) => aoMudar({ ...formula, expressao: e.target.value })}
          placeholder="CA + MG + K / 391 + NA"
          className={cn(
            'num h-10',
            formula.expressao.trim() && !conferencia.ok && 'border-[hsl(var(--danger))]',
          )}
        />

        {formula.expressao.trim() !== '' && (
          <p className={cn(
            'mt-2 flex items-start gap-1.5 text-[0.7rem] leading-relaxed',
            conferencia.ok ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--danger))]',
          )}>
            {conferencia.ok
              ? <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              : <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
            <span>
              {conferencia.ok
                ? `Equação válida sobre ${conferencia.variaveis.join(', ') || 'constantes'}.`
                : conferencia.erro}
            </span>
          </p>
        )}
      </div>

      {/* --- Simulação --- */}
      {conferencia.ok && conferencia.variaveis.length > 0 && (
        <div className="panel-sunken p-3.5">
          <p className="label-micro mb-2.5 flex items-center gap-1.5">
            <Calculator className="h-3 w-3" /> Testar com valores
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {conferencia.variaveis.map((v) => (
              <div key={v}>
                <Label className="label-micro mb-1 block" htmlFor={`t-${v}`}>{v}</Label>
                <Input
                  id={`t-${v}`} value={teste[v] ?? ''}
                  onChange={(e) => setTeste((t) => ({ ...t, [v]: e.target.value }))}
                  className="num h-8 text-xs" placeholder="—"
                />
              </div>
            ))}
          </div>

          {simulacao && (
            <p className="mt-3 border-t border-[hsl(var(--line-soft))] pt-2.5 text-xs">
              {simulacao.faltando.length > 0 ? (
                <span className="text-muted-foreground">
                  Preencha {simulacao.faltando.join(', ')} para ver o resultado.
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Resultado:{' '}
                  <span className="num text-base font-semibold text-foreground">
                    {Number.isFinite(simulacao.valor) ? numero(simulacao.valor, 4) : '—'}
                  </span>
                  {alvo?.unidade && <span className="num ml-1">{alvo.unidade}</span>}
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {/* --- Ajuda --- */}
      <div className="text-[0.68rem] leading-relaxed text-muted-foreground">
        <p className="mb-1.5">
          Use os códigos dos elementos desta análise como variáveis, com espaço em volta dos
          sinais: <span className="num text-foreground">CA + MG</span>. Decimal com vírgula.
        </p>
        <div className="flex flex-wrap gap-1">
          {Object.keys(FUNCOES).map((f) => (
            <Pilula key={f} className="px-1.5 py-0 text-[0.6rem]">{f}()</Pilula>
          ))}
        </div>
        {disponiveis.length > 0 && (
          <p className="mt-2">
            Disponíveis:{' '}
            <span className="num text-foreground">
              {disponiveis.slice(0, 18).map((p) => p.codigo).join(', ')}
              {disponiveis.length > 18 && '…'}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
