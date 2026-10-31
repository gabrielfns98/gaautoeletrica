/* ============================================================
   BANCADA — qualidade analítica

   Duas perguntas diferentes, e é por isso que são duas abas:

   - **Controle interno** — a bancada está estável? Responde a
     carta de Levey-Jennings sobre o material de referência.
   - **Proficiência** — a bancada está certa? Só o programa
     interlaboratorial responde, porque o valor verdadeiro vem de
     fora. Uma bancada pode repetir o mesmo erro com desvio padrão
     exemplar por anos, e a carta fica impecável o tempo todo.

   O controle interno morava dentro do módulo de pH, como se fosse
   assunto de eletrodo. É de todo ensaio.
   ============================================================ */

import { useMemo, useState } from 'react';
import { TrendingDown, TrendingUp, TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';

import ControleInterno from './ph/ControleQualidade';
import { useBancada } from '../data/store';
import {
  ROTULO_DESEMPENHO, avaliarTendencia, calcularEscore, resumirRodada,
} from '../lib/interlaboratorial';
import type { Desempenho } from '../lib/interlaboratorial';
import { data as fData, numero, numeroAte } from '../lib/format';
import {
  CabecalhoPagina, Indicador, Pilula, Secao, Segmentos, Tabela, Vazio,
} from '../components/primitivos';
import type { TomStatus } from '../components/primitivos';
import type { ResultadoProficiencia, RodadaProficiencia, StatusRodada } from '../types';

const TOM_DESEMPENHO: Record<Desempenho, TomStatus> = {
  satisfatorio: 'sucesso',
  questionavel: 'alerta',
  insatisfatorio: 'erro',
};

const TOM_RODADA: Record<StatusRodada, TomStatus> = {
  inscrita: 'neutro',
  recebida: 'info',
  enviada: 'alerta',
  avaliada: 'sucesso',
  cancelada: 'erro',
};

const ROTULO_RODADA: Record<StatusRodada, string> = {
  inscrita: 'Inscrita',
  recebida: 'Na bancada',
  enviada: 'Aguardando relatório',
  avaliada: 'Avaliada',
  cancelada: 'Cancelada',
};

/** z formatado com sinal: o lado do erro é informação. */
const comSinal = (z: number) => `${z > 0 ? '+' : ''}${numero(z, 2)}`;

/* ---------------- Proficiência ---------------- */

function Proficiencia() {
  const { estado } = useBancada();
  const [rodadaId, setRodadaId] = useState<string | undefined>();

  const parametroPorId = useMemo(
    () => new Map(estado.parametros.map((p) => [p.id, p])),
    [estado.parametros],
  );
  const programaPorId = useMemo(
    () => new Map(estado.programasProficiencia.map((p) => [p.id, p])),
    [estado.programasProficiencia],
  );

  /* Os escores não são gravados: saem da conta toda vez. Se o
     organizador reemite o relatório com outro valor designado, o
     histórico inteiro se corrige sozinho — um z gravado ficaria
     discordando da própria conta. */
  const escorePorResultado = useMemo(() => {
    const mapa = new Map<string, ReturnType<typeof calcularEscore>>();
    for (const r of estado.resultadosProficiencia) {
      if (r.designado === undefined || r.desvioAlvo === undefined) continue;
      mapa.set(r.id, calcularEscore({
        valor: r.valor,
        designado: r.designado,
        desvioAlvo: r.desvioAlvo,
        incertezaDesignado: r.incertezaDesignado,
        incertezaLaboratorio: r.incerteza,
        incertezaExpandidaDesignado: r.incertezaExpandidaDesignado,
      }));
    }
    return mapa;
  }, [estado.resultadosProficiencia]);

  /* As rodadas em ordem cronológica, da mais recente para cima. */
  const rodadas = useMemo(
    () => [...estado.rodadasProficiencia].sort(
      (a, b) => (b.dataRecebimento ?? '').localeCompare(a.dataRecebimento ?? ''),
    ),
    [estado.rodadasProficiencia],
  );

  const resumoDaRodada = useMemo(() => {
    const mapa = new Map<string, ReturnType<typeof resumirRodada>>();
    for (const rodada of rodadas) {
      const itens = estado.resultadosProficiencia
        .filter((r) => r.rodadaId === rodada.id)
        .map((r) => {
          const e = escorePorResultado.get(r.id);
          return {
            ensaio: parametroPorId.get(r.parametroId)?.codigo ?? '—',
            z: e?.z,
            desempenho: e?.desempenho ?? ('questionavel' as Desempenho),
          };
        });
      mapa.set(rodada.id, resumirRodada(itens));
    }
    return mapa;
  }, [rodadas, estado.resultadosProficiencia, escorePorResultado, parametroPorId]);

  /* Viés por ensaio, ao longo das rodadas avaliadas. É o que a
     rodada isolada não mostra e o controle interno nunca mostra. */
  const tendencias = useMemo(() => {
    const cronologicas = [...estado.rodadasProficiencia]
      .filter((r) => r.status === 'avaliada')
      .sort((a, b) => (a.dataRecebimento ?? '').localeCompare(b.dataRecebimento ?? ''));

    const porParametro = new Map<string, number[]>();
    for (const rodada of cronologicas) {
      for (const r of estado.resultadosProficiencia.filter((x) => x.rodadaId === rodada.id)) {
        const z = escorePorResultado.get(r.id)?.z;
        if (z === undefined) continue;
        const lista = porParametro.get(r.parametroId) ?? [];
        lista.push(z);
        porParametro.set(r.parametroId, lista);
      }
    }

    return [...porParametro.entries()]
      .map(([parametroId, zs]) => ({
        parametroId,
        codigo: parametroPorId.get(parametroId)?.codigo ?? '—',
        nome: parametroPorId.get(parametroId)?.nome ?? '—',
        zs,
        avaliacao: avaliarTendencia(zs),
      }))
      .sort((a, b) => {
        // Quem tem viés aparece primeiro: é o que exige ação.
        const peso = (t: string) => (t === 'estavel' ? 1 : 0);
        return peso(a.avaliacao.tendencia) - peso(b.avaliacao.tendencia)
          || a.codigo.localeCompare(b.codigo, 'pt-BR');
      });
  }, [estado.rodadasProficiencia, estado.resultadosProficiencia, escorePorResultado, parametroPorId]);

  const comVies = tendencias.filter((t) => t.avaliacao.tendencia !== 'estavel');
  const ultimaAvaliada = rodadas.find((r) => r.status === 'avaliada');
  const resumoUltima = ultimaAvaliada ? resumoDaRodada.get(ultimaAvaliada.id) : undefined;

  const selecionada: RodadaProficiencia | undefined =
    rodadas.find((r) => r.id === rodadaId) ?? ultimaAvaliada ?? rodadas[0];

  const resultadosSelecionados = useMemo(
    () => (selecionada
      ? estado.resultadosProficiencia.filter((r) => r.rodadaId === selecionada.id)
      : []),
    [selecionada, estado.resultadosProficiencia],
  );

  if (estado.programasProficiencia.length === 0) {
    return (
      <Vazio
        titulo="Nenhum programa cadastrado"
        descricao="A ISO/IEC 17025 (7.7.2) exige participação em ensaio de proficiência. Cadastre o programa para registrar as rodadas."
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* --- Indicadores --- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador
          rotulo="Programas ativos"
          valor={String(estado.programasProficiencia.filter((p) => p.ativo).length)}
          detalhe={`${estado.programasProficiencia.length} cadastrados`}
        />
        <Indicador
          rotulo="Última rodada avaliada"
          valor={resumoUltima ? `${numeroAte(resumoUltima.indice, 0)}%` : '—'}
          detalhe={resumoUltima
            ? `${resumoUltima.satisfatorios} de ${resumoUltima.total} satisfatórios`
            : 'nenhuma rodada avaliada'}
        />
        <Indicador
          rotulo="Pior z da última"
          valor={resumoUltima?.piorZ !== undefined ? comSinal(resumoUltima.piorZ) : '—'}
          detalhe={resumoUltima?.piorEnsaio ?? '—'}
          destaque={resumoUltima?.piorZ !== undefined && Math.abs(resumoUltima.piorZ) >= 3}
        />
        <Indicador
          rotulo="Ensaios com viés"
          valor={String(comVies.length)}
          detalhe="rodadas seguidas do mesmo lado"
          destaque={comVies.length > 0}
        />
      </div>

      {/* --- Viés: o que a rodada isolada não mostra --- */}
      {comVies.length > 0 && (
        <Secao
          titulo="Viés sistemático"
          descricao="Rodadas seguidas do mesmo lado do valor designado. O controle interno não acusa isto: um método que erra sempre o mesmo tanto tem carta de Levey-Jennings impecável."
        >
          <div className="space-y-2">
            {comVies.map((t) => (
              <div
                key={t.parametroId}
                className="flex flex-wrap items-start gap-3 rounded-[var(--radius-sm)] border border-[hsl(var(--line))] bg-[hsl(var(--surface-sunken))] p-3"
              >
                {t.avaliacao.tendencia === 'tendencia-alta'
                  ? <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />
                  : <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    <span className="num font-medium">{t.codigo}</span>
                    <span className="text-muted-foreground"> · {t.nome}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{t.avaliacao.mensagem}</p>
                </div>
                <span className="num shrink-0 text-xs text-muted-foreground">
                  {t.zs.map((z) => comSinal(z)).join('  ')}
                </span>
              </div>
            ))}
          </div>
        </Secao>
      )}

      {/* --- Rodadas --- */}
      <Secao
        titulo="Rodadas"
        descricao="Cada rodada é uma amostra cega enviada a dezenas de laboratórios; o valor designado sai do consenso."
        semPadding
      >
        <Tabela
          dados={rodadas}
          chaveDe={(r) => r.id}
          aoClicar={(r) => setRodadaId(r.id)}
          colunas={[
            {
              chave: 'codigo', titulo: 'Rodada',
              valor: (r: RodadaProficiencia) => r.codigo,
              render: (r) => (
                <span className={cn('num text-xs', selecionada?.id === r.id && 'font-medium text-foreground')}>
                  {r.codigo}
                </span>
              ),
            },
            {
              chave: 'programa', titulo: 'Programa',
              valor: (r) => programaPorId.get(r.programaId)?.codigo ?? '',
              render: (r) => (
                <span className="text-xs">
                  {programaPorId.get(r.programaId)?.codigo ?? '—'}
                  <span className="text-muted-foreground">
                    {' · '}{programaPorId.get(r.programaId)?.organizador}
                  </span>
                </span>
              ),
            },
            {
              chave: 'status', titulo: 'Situação',
              render: (r) => (
                <Pilula tom={TOM_RODADA[r.status]} pontinho>{ROTULO_RODADA[r.status]}</Pilula>
              ),
            },
            {
              chave: 'prazo', titulo: 'Envio', secundaria: true, alinhamento: 'direita',
              valor: (r) => r.dataEnvio ?? r.prazoEnvio,
              render: (r) => (
                <span className="num text-xs text-muted-foreground">
                  {r.dataEnvio ? fData(r.dataEnvio) : `prazo ${fData(r.prazoEnvio)}`}
                </span>
              ),
            },
            {
              chave: 'participantes', titulo: 'Partic.', alinhamento: 'direita', secundaria: true,
              valor: (r) => r.participantes ?? 0,
              render: (r) => (
                <span className="num text-xs text-muted-foreground">{r.participantes ?? '—'}</span>
              ),
            },
            {
              chave: 'indice', titulo: 'Satisfatórios', alinhamento: 'direita',
              valor: (r) => resumoDaRodada.get(r.id)?.indice ?? 0,
              render: (r) => {
                const resumo = resumoDaRodada.get(r.id);
                if (!resumo || r.status !== 'avaliada') {
                  return <span className="text-xs text-muted-foreground">—</span>;
                }
                return (
                  <span className={cn(
                    'num text-xs',
                    resumo.indice < 80 ? 'text-[hsl(var(--warning))]' : 'text-foreground',
                  )}>
                    {resumo.satisfatorios}/{resumo.total}
                  </span>
                );
              },
            },
          ]}
        />
      </Secao>

      {/* --- Resultados da rodada escolhida --- */}
      {selecionada && (
        <Secao
          titulo={`Rodada ${selecionada.codigo}`}
          descricao={selecionada.status === 'avaliada'
            ? 'z é a diferença em unidades do desvio padrão que o programa considera aceitável — não o erro bruto.'
            : 'Os valores designados chegam com o relatório do organizador; até lá só há o que o laboratório relatou.'}
          semPadding
        >
          <Tabela
            dados={resultadosSelecionados}
            chaveDe={(r) => r.id}
            vazio={<Vazio titulo="Rodada sem resultados registrados" />}
            colunas={[
              {
                chave: 'ensaio', titulo: 'Ensaio',
                valor: (r: ResultadoProficiencia) => parametroPorId.get(r.parametroId)?.codigo ?? '',
                render: (r) => (
                  <span className="num text-xs font-medium">
                    {parametroPorId.get(r.parametroId)?.codigo ?? '—'}
                  </span>
                ),
              },
              {
                chave: 'nosso', titulo: 'Relatado', alinhamento: 'direita',
                valor: (r) => r.valor,
                render: (r) => (
                  <span className="num text-xs">
                    {numero(r.valor, parametroPorId.get(r.parametroId)?.casasDecimais ?? 2)}
                  </span>
                ),
              },
              {
                chave: 'designado', titulo: 'Designado', alinhamento: 'direita', secundaria: true,
                valor: (r) => r.designado ?? 0,
                render: (r) => (
                  <span className="num text-xs text-muted-foreground">
                    {r.designado === undefined
                      ? '—'
                      : numero(r.designado, parametroPorId.get(r.parametroId)?.casasDecimais ?? 2)}
                  </span>
                ),
              },
              {
                chave: 'sigma', titulo: 'σ', alinhamento: 'direita', secundaria: true,
                render: (r) => (
                  <span className="num text-xs text-muted-foreground">
                    {r.desvioAlvo === undefined ? '—' : numeroAte(r.desvioAlvo, 2)}
                  </span>
                ),
              },
              {
                chave: 'erro', titulo: 'Erro', alinhamento: 'direita', secundaria: true,
                render: (r) => {
                  const e = escorePorResultado.get(r.id);
                  return (
                    <span className="num text-xs text-muted-foreground">
                      {e?.erroRelativo === undefined ? '—' : `${numeroAte(e.erroRelativo, 1)}%`}
                    </span>
                  );
                },
              },
              {
                chave: 'z', titulo: 'z', alinhamento: 'direita',
                valor: (r) => Math.abs(escorePorResultado.get(r.id)?.z ?? 0),
                render: (r) => {
                  const e = escorePorResultado.get(r.id);
                  if (e?.z === undefined) return <span className="text-xs text-muted-foreground">—</span>;
                  return (
                    <span className={cn(
                      'num text-xs',
                      e.desempenho === 'insatisfatorio' && 'text-[hsl(var(--danger))]',
                      e.desempenho === 'questionavel' && 'text-[hsl(var(--warning))]',
                    )}>
                      {comSinal(e.z)}
                    </span>
                  );
                },
              },
              {
                chave: 'en', titulo: 'En', alinhamento: 'direita', secundaria: true,
                render: (r) => {
                  const e = escorePorResultado.get(r.id);
                  return (
                    <span className="num text-xs text-muted-foreground">
                      {e?.en === undefined ? '—' : comSinal(e.en)}
                    </span>
                  );
                },
              },
              {
                chave: 'desempenho', titulo: '', alinhamento: 'direita',
                render: (r) => {
                  const e = escorePorResultado.get(r.id);
                  if (!e || e.z === undefined) return null;
                  return (
                    <Pilula tom={TOM_DESEMPENHO[e.desempenho]}>
                      {ROTULO_DESEMPENHO[e.desempenho]}
                    </Pilula>
                  );
                },
              },
            ]}
          />

          {/* A ação corretiva é a evidência que o auditor procura:
              z reprovado sem registro de causa e ação é não
              conformidade, ainda que o ensaio seguinte passe. */}
          {resultadosSelecionados.some((r) => r.acaoCorretiva) && (
            <div className="border-t border-[hsl(var(--line))] p-4">
              <p className="flex items-center gap-2 text-xs font-medium text-foreground">
                <TriangleAlert className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />
                Ações corretivas registradas
              </p>
              <ul className="mt-2 space-y-1.5">
                {resultadosSelecionados.filter((r) => r.acaoCorretiva).map((r) => (
                  <li key={r.id} className="text-xs text-muted-foreground">
                    <span className="num text-foreground">
                      {parametroPorId.get(r.parametroId)?.codigo}
                    </span>
                    {' — '}{r.acaoCorretiva}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Secao>
      )}

      {/* --- Programas --- */}
      <Secao titulo="Programas" semPadding>
        <Tabela
          dados={estado.programasProficiencia}
          chaveDe={(p) => p.id}
          colunas={[
            {
              chave: 'codigo', titulo: 'Código', valor: (p) => p.codigo,
              render: (p) => <span className="num text-xs font-medium">{p.codigo}</span>,
            },
            { chave: 'nome', titulo: 'Programa', render: (p) => <span className="text-xs">{p.nome}</span> },
            {
              chave: 'organizador', titulo: 'Organizador', secundaria: true,
              render: (p) => <span className="text-xs text-muted-foreground">{p.organizador}</span>,
            },
            {
              chave: 'rodadas', titulo: 'Rodadas/ano', alinhamento: 'direita', secundaria: true,
              valor: (p) => p.rodadasPorAno,
              render: (p) => <span className="num text-xs text-muted-foreground">{p.rodadasPorAno}</span>,
            },
            {
              chave: 'ativo', titulo: '', alinhamento: 'direita',
              render: (p) => !p.ativo && (
                <Pilula tom="neutro" className="px-1.5 py-0 text-[0.62rem]">inativo</Pilula>
              ),
            },
          ]}
        />
      </Secao>
    </div>
  );
}

/* ---------------- Entrada ---------------- */

export default function Qualidade() {
  const [aba, setAba] = useState<'interno' | 'proficiencia'>('interno');

  return (
    <div className="space-y-5">
      <CabecalhoPagina
        titulo="Qualidade analítica"
        descricao="O controle interno diz se a bancada está estável. Só o interlaboratorial diz se ela está certa."
        acoes={(
          <Segmentos
            valor={aba}
            aoMudar={setAba}
            opcoes={[
              { valor: 'interno', rotulo: 'Controle interno' },
              { valor: 'proficiencia', rotulo: 'Proficiência' },
            ]}
          />
        )}
      />
      {aba === 'interno' ? <ControleInterno /> : <Proficiencia />}
    </div>
  );
}
