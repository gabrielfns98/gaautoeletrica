/* ============================================================
   BANCADA — controle metrológico, para qualquer aparelho

   Até aqui só o potenciômetro tinha calibração acompanhada e leitura
   bloqueada quando vencia. O espectrofotômetro, a absorção atômica,
   a balança e a estufa produziam número sem ninguém perguntar quando
   foram verificados pela última vez — e é isso que uma auditoria da
   ISO/IEC 17025 olha primeiro.

   Aqui a regra é a mesma para todos, e quem define o rito é o
   cadastro de tipo de equipamento, não o código.
   ============================================================ */

import { diasEntre } from './format';
import type { Equipamento, TipoEquipamento, VerificacaoEquipamento } from '../types';

export interface SituacaoMetrologica {
  /** a verificação mais recente, quando existe */
  ultima?: VerificacaoEquipamento;
  /** nunca verificado desde que entrou no cadastro */
  semHistorico: boolean;
  vencida: boolean;
  /** negativo quando já venceu; undefined sem histórico */
  diasParaVencer?: number;
  /** vence dentro da janela de aviso */
  vencendo: boolean;
  /** a última verificação reprovou */
  reprovada: boolean;
}

/** Quantos dias antes do vencimento o painel começa a avisar. */
export const JANELA_AVISO_DIAS = 7;

/**
 * Situação do aparelho num instante.
 *
 * Só a verificação mais recente decide: uma aprovada em seguida a uma
 * reprovada significa que o problema foi resolvido, e manter o
 * aparelho bloqueado por causa do histórico pararia a bancada à toa.
 */
export function situacaoMetrologica(
  equipamentoId: string,
  verificacoes: VerificacaoEquipamento[],
  agora: Date = new Date(),
): SituacaoMetrologica {
  const doEquipamento = verificacoes
    .filter((v) => v.equipamentoId === equipamentoId)
    .sort((a, b) => +new Date(b.data) - +new Date(a.data));

  const ultima = doEquipamento[0];
  if (!ultima) {
    return { semHistorico: true, vencida: true, vencendo: false, reprovada: false };
  }

  const diasParaVencer = diasEntre(agora, ultima.validaAte);
  const vencida = diasParaVencer < 0;

  return {
    ultima,
    semHistorico: false,
    vencida,
    diasParaVencer,
    vencendo: !vencida && diasParaVencer <= JANELA_AVISO_DIAS,
    reprovada: ultima.resultado === 'reprovada',
  };
}

export interface Liberacao {
  permitido: boolean;
  motivo?: string;
}

/**
 * Se a bancada pode usar o aparelho agora.
 *
 * O bloqueio é escolha do laboratório, tipo a tipo: uma estufa com
 * verificação vencida atrasa um ensaio, mas um espectro fora de
 * calibração produz número errado que ninguém percebe. Por isso
 * `bloqueiaVencido` mora no cadastro.
 *
 * Reprovação bloqueia sempre, independente do cadastro: aparelho que
 * falhou a verificação não mede, e deixar isso configurável seria
 * oferecer ao laboratório uma forma de desligar o próprio controle.
 */
export function podeLer(
  equipamento: Equipamento,
  tipo: TipoEquipamento | undefined,
  verificacoes: VerificacaoEquipamento[],
  agora: Date = new Date(),
): Liberacao {
  if (!equipamento.ativo) {
    return { permitido: false, motivo: `${equipamento.tag} está inativo no cadastro.` };
  }
  if (!tipo || tipo.verificacao === 'nenhuma') return { permitido: true };

  const s = situacaoMetrologica(equipamento.id, verificacoes, agora);

  if (s.reprovada) {
    return {
      permitido: false,
      motivo: `A última verificação de ${equipamento.tag} foi reprovada. Ajuste o aparelho e verifique de novo antes de ler.`,
    };
  }
  if (!tipo.bloqueiaVencido) return { permitido: true };

  if (s.semHistorico) {
    return {
      permitido: false,
      motivo: `${equipamento.tag} não tem verificação registrada. Faça a primeira antes de usar.`,
    };
  }
  if (s.vencida) {
    return {
      permitido: false,
      motivo: `A verificação de ${equipamento.tag} venceu há ${Math.abs(s.diasParaVencer ?? 0)} dia(s). Refaça antes de ler.`,
    };
  }
  return { permitido: true };
}

/** Erro relativo da verificação, em %, como o POP manda calcular. */
export function erroPercentual(nominal: number, medido: number): number {
  if (!Number.isFinite(nominal) || !Number.isFinite(medido) || nominal === 0) return NaN;
  return ((medido - nominal) / nominal) * 100;
}

/**
 * Veredito de uma verificação por padrão, dado o erro tolerado.
 * A faixa de alerta é a metade de cima da tolerância: o aparelho
 * ainda passa, mas já está derivando e convém olhar.
 */
export function avaliarVerificacao(
  erro: number,
  toleranciaPercentual: number,
): VerificacaoEquipamento['resultado'] {
  const absoluto = Math.abs(erro);
  if (!Number.isFinite(absoluto) || absoluto > toleranciaPercentual) return 'reprovada';
  if (absoluto > toleranciaPercentual / 2) return 'alerta';
  return 'aprovada';
}

/** Quando a próxima verificação vence, a partir da periodicidade do tipo. */
export function vencimentoDaVerificacao(data: Date, periodicidadeDias: number): string {
  const d = new Date(data);
  d.setDate(d.getDate() + periodicidadeDias);
  return d.toISOString();
}
