/* ============================================================
   BANCADA — estado da aplicação
   Camada única de leitura e escrita. As funções de mutação têm
   a mesma assinatura que terão quando apontarem para o Supabase,
   então trocar a fonte não altera as telas.

   A massa de demonstração vive em memória: os traces de
   estabilização somam alguns megabytes e não cabem com folga no
   localStorage. Só preferências leves são persistidas.
   ============================================================ */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState,
} from 'react';
import type { ReactNode } from 'react';

import * as seed from './seed';
import { PAPEIS_PADRAO } from '../lib/rbac';
import { avaliarCQ, calcularCalibracao } from '../lib/ph';
import { apurarNotaServico } from '../lib/fiscal';
import type {
  Amostra, AmostraControle, Calibracao, Cliente, Contato, Ensaio, Equipamento,
  GrupoAnalise, Interacao, ItemEstoque, Laudo, LeituraPh, LoteReagente,
  LoteRecepcao, Modulo, MovimentoEstoque, NotaFiscal, Oportunidade, Orcamento,
  Papel, Parametro, Permissao, PontoCalibracao, RegistroAuditoria, RegistroCQ,
  StatusAmostra, StatusEnsaio, TabelaPreco, TipoAnalise, Titulo, Unidade, Usuario, UUID,
  Bandeja, Convenio, Curva, Legenda, Metodologia, RegraDesconto, ItemSimples,
} from '../types';

/* ---------------- Formato do estado ---------------- */

export interface EstadoBancada {
  unidades: Unidade[];
  unidadeAtivaId: UUID;
  usuarios: Usuario[];
  usuarioAtualId: UUID;
  papeis: Papel[];
  grupos: GrupoAnalise[];
  tiposAnalise: TipoAnalise[];
  curvas: Curva[];
  legendas: Legenda[];
  metodologias: Metodologia[];
  bandejas: Bandeja[];
  profundidades: ItemSimples[];
  culturas: ItemSimples[];
  tiposCliente: ItemSimples[];
  convenios: Convenio[];
  regrasDesconto: RegraDesconto[];
  observacoesFixas: ItemSimples[];
  parametros: Parametro[];
  clientes: Cliente[];
  contatos: Contato[];
  oportunidades: Oportunidade[];
  interacoes: Interacao[];
  tabelasPreco: TabelaPreco[];
  lotesRecepcao: LoteRecepcao[];
  amostras: Amostra[];
  ensaios: Ensaio[];
  leiturasPh: LeituraPh[];
  equipamentos: Equipamento[];
  calibracoes: Calibracao[];
  amostrasControle: AmostraControle[];
  registrosCQ: RegistroCQ[];
  laudos: Laudo[];
  orcamentos: Orcamento[];
  titulos: Titulo[];
  notasFiscais: NotaFiscal[];
  itensEstoque: ItemEstoque[];
  lotesReagente: LoteReagente[];
  movimentosEstoque: MovimentoEstoque[];
  auditoria: RegistroAuditoria[];
}

function estadoInicial(): EstadoBancada {
  return {
    unidades: seed.unidades,
    unidadeAtivaId: seed.unidades[0].id,
    usuarios: seed.usuarios,
    usuarioAtualId: seed.usuarioAtual.id,
    papeis: PAPEIS_PADRAO,
    grupos: seed.grupos,
    tiposAnalise: seed.tiposAnalise,
    curvas: seed.curvas,
    legendas: seed.legendas,
    metodologias: seed.metodologias,
    bandejas: seed.bandejas,
    profundidades: seed.profundidades,
    culturas: seed.culturas,
    tiposCliente: seed.tiposCliente,
    convenios: seed.convenios,
    regrasDesconto: seed.regrasDesconto,
    observacoesFixas: seed.observacoesFixas,
    parametros: seed.parametros,
    clientes: seed.clientes,
    contatos: seed.contatos,
    oportunidades: seed.oportunidades,
    interacoes: seed.interacoes,
    tabelasPreco: seed.tabelasPreco,
    lotesRecepcao: seed.lotesRecepcao,
    amostras: seed.amostras,
    ensaios: seed.ensaios,
    leiturasPh: seed.leiturasPh,
    equipamentos: seed.equipamentos,
    calibracoes: seed.calibracoes,
    amostrasControle: seed.amostrasControle,
    registrosCQ: seed.registrosCQ,
    laudos: seed.laudos,
    orcamentos: seed.orcamentos,
    titulos: seed.titulos,
    notasFiscais: seed.notasFiscais,
    itensEstoque: seed.itensEstoque,
    lotesReagente: seed.lotesReagente,
    movimentosEstoque: seed.movimentosEstoque,
    auditoria: seed.auditoria,
  };
}

/* ---------------- Ações ---------------- */

type Acao =
  | { tipo: 'trocar-usuario'; usuarioId: UUID }
  | { tipo: 'trocar-unidade'; unidadeId: UUID }
  | { tipo: 'registrar-leitura'; leitura: LeituraPh; valor: number }
  | { tipo: 'salvar-calibracao'; calibracao: Calibracao }
  | { tipo: 'atualizar-ensaio'; ensaioId: UUID; dados: Partial<Ensaio> }
  | { tipo: 'lancar-resultados'; entradas: Array<{ ensaioId: UUID; valor: number }>; analistaId: UUID }
  | { tipo: 'atualizar-amostra'; amostraId: UUID; dados: Partial<Amostra> }
  | { tipo: 'criar-recepcao'; lote: LoteRecepcao; amostras: Amostra[]; ensaios: Ensaio[] }
  | { tipo: 'atualizar-laudo'; laudoId: UUID; dados: Partial<Laudo> }
  | { tipo: 'criar-laudo'; laudo: Laudo }
  | { tipo: 'criar-nota'; nota: NotaFiscal; titulo?: Titulo }
  | { tipo: 'atualizar-nota'; notaId: UUID; dados: Partial<NotaFiscal> }
  | { tipo: 'atualizar-titulo'; tituloId: UUID; dados: Partial<Titulo> }
  | { tipo: 'criar-titulo'; titulo: Titulo }
  | { tipo: 'mover-oportunidade'; oportunidadeId: UUID; estagio: Oportunidade['estagio'] }
  | { tipo: 'salvar-cliente'; cliente: Cliente }
  | { tipo: 'registrar-interacao'; interacao: Interacao }
  | { tipo: 'movimentar-estoque'; movimento: MovimentoEstoque }
  | { tipo: 'salvar-usuario'; usuario: Usuario }
  | { tipo: 'salvar-papel'; papel: Papel }
  | { tipo: 'salvar-curva'; curva: Curva }
  | { tipo: 'salvar-legenda'; legenda: Legenda }
  | { tipo: 'registrar-cq'; registro: RegistroCQ }
  | { tipo: 'auditar'; registro: RegistroAuditoria }
  | { tipo: 'restaurar' };

const substituir = <T extends { id: UUID }>(lista: T[], item: T): T[] => {
  const i = lista.findIndex((x) => x.id === item.id);
  return i === -1 ? [item, ...lista] : lista.map((x) => (x.id === item.id ? item : x));
};

const mesclar = <T extends { id: UUID }>(lista: T[], id: UUID, dados: Partial<T>): T[] =>
  lista.map((x) => (x.id === id ? { ...x, ...dados } : x));

function redutor(estado: EstadoBancada, acao: Acao): EstadoBancada {
  switch (acao.tipo) {
    case 'trocar-usuario':
      return { ...estado, usuarioAtualId: acao.usuarioId };
    case 'trocar-unidade':
      return { ...estado, unidadeAtivaId: acao.unidadeId };

    case 'registrar-leitura': {
      const param = estado.parametros.find((p) => p.id === acao.leitura.parametroId);
      const casas = param?.casasDecimais ?? 2;
      return {
        ...estado,
        leiturasPh: [acao.leitura, ...estado.leiturasPh],
        ensaios: mesclar(estado.ensaios, acao.leitura.ensaioId, {
          status: 'lido',
          valor: Number(acao.valor.toFixed(casas)),
          analistaId: acao.leitura.analistaId,
          dataLeitura: acao.leitura.dataHora,
          leituraPhId: acao.leitura.id,
          foraDeFaixa:
            param?.limiteInferior !== undefined &&
            (acao.valor < param.limiteInferior || acao.valor > (param.limiteSuperior ?? Infinity)),
        } as Partial<Ensaio>),
      };
    }

    case 'salvar-calibracao': {
      // a nova calibração vence as anteriores do mesmo equipamento
      const antigas = estado.calibracoes.map((c) =>
        c.equipamentoId === acao.calibracao.equipamentoId && c.status === 'valida'
          ? { ...c, status: 'vencida' as const }
          : c,
      );
      return { ...estado, calibracoes: [acao.calibracao, ...antigas] };
    }

    case 'atualizar-ensaio':
      return { ...estado, ensaios: mesclar(estado.ensaios, acao.ensaioId, acao.dados) };

    case 'lancar-resultados': {
      const agora = new Date().toISOString();
      const porEnsaio = new Map(acao.entradas.map((e) => [e.ensaioId, e.valor]));
      const tocadas = new Set<UUID>();

      const ensaios = estado.ensaios.map((e) => {
        if (!porEnsaio.has(e.id)) return e;
        const valor = porEnsaio.get(e.id)!;
        const param = estado.parametros.find((p) => p.id === e.parametroId);
        tocadas.add(e.amostraId);
        return {
          ...e,
          status: 'lido' as const,
          valor: Number(valor.toFixed(param?.casasDecimais ?? 2)),
          analistaId: acao.analistaId,
          dataLeitura: agora,
          foraDeFaixa:
            param?.limiteInferior !== undefined &&
            (valor < param.limiteInferior || valor > (param.limiteSuperior ?? Infinity)),
        };
      });

      // a amostra que recebeu resultado sai da recepção e entra em análise
      const amostras = estado.amostras.map((a) =>
        tocadas.has(a.id) && (a.status === 'recebida' || a.status === 'preparo')
          ? { ...a, status: 'em-analise' as const }
          : a);

      return { ...estado, ensaios, amostras };
    }

    case 'atualizar-amostra':
      return { ...estado, amostras: mesclar(estado.amostras, acao.amostraId, acao.dados) };

    case 'criar-recepcao':
      return {
        ...estado,
        lotesRecepcao: [acao.lote, ...estado.lotesRecepcao],
        amostras: [...acao.amostras, ...estado.amostras],
        ensaios: [...acao.ensaios, ...estado.ensaios],
      };

    case 'criar-laudo':
      return { ...estado, laudos: [acao.laudo, ...estado.laudos] };
    case 'atualizar-laudo':
      return { ...estado, laudos: mesclar(estado.laudos, acao.laudoId, acao.dados) };

    case 'criar-nota':
      return {
        ...estado,
        notasFiscais: [acao.nota, ...estado.notasFiscais],
        titulos: acao.titulo ? [acao.titulo, ...estado.titulos] : estado.titulos,
      };
    case 'atualizar-nota':
      return { ...estado, notasFiscais: mesclar(estado.notasFiscais, acao.notaId, acao.dados) };

    case 'criar-titulo':
      return { ...estado, titulos: [acao.titulo, ...estado.titulos] };
    case 'atualizar-titulo':
      return { ...estado, titulos: mesclar(estado.titulos, acao.tituloId, acao.dados) };

    case 'mover-oportunidade':
      return {
        ...estado,
        oportunidades: mesclar(estado.oportunidades, acao.oportunidadeId, {
          estagio: acao.estagio,
          ultimaInteracao: new Date().toISOString(),
          probabilidade: acao.estagio === 'ganho' ? 100 : acao.estagio === 'perdido' ? 0 : undefined,
        } as Partial<Oportunidade>),
      };

    case 'salvar-cliente':
      return { ...estado, clientes: substituir(estado.clientes, acao.cliente) };

    case 'registrar-interacao':
      return { ...estado, interacoes: [acao.interacao, ...estado.interacoes] };

    case 'movimentar-estoque': {
      const sinal = acao.movimento.tipo === 'entrada' ? 1 : -1;
      return {
        ...estado,
        movimentosEstoque: [acao.movimento, ...estado.movimentosEstoque],
        itensEstoque: estado.itensEstoque.map((i) =>
          i.id === acao.movimento.itemId
            ? { ...i, saldo: Math.max(0, Number((i.saldo + sinal * acao.movimento.quantidade).toFixed(3))) }
            : i,
        ),
      };
    }

    case 'salvar-usuario':
      return { ...estado, usuarios: substituir(estado.usuarios, acao.usuario) };
    case 'salvar-papel':
      return { ...estado, papeis: substituir(estado.papeis, acao.papel) };

    case 'salvar-curva':
      return { ...estado, curvas: substituir(estado.curvas, acao.curva) };
    case 'salvar-legenda':
      return { ...estado, legendas: substituir(estado.legendas, acao.legenda) };

    case 'registrar-cq':
      return { ...estado, registrosCQ: [acao.registro, ...estado.registrosCQ] };

    case 'auditar':
      return { ...estado, auditoria: [acao.registro, ...estado.auditoria].slice(0, 400) };

    case 'restaurar':
      return estadoInicial();

    default:
      return estado;
  }
}

/* ---------------- Contexto ---------------- */

export type Tema = 'dark' | 'light';

interface ContextoBancada {
  estado: EstadoBancada;
  despachar: React.Dispatch<Acao>;
  usuario: Usuario;
  papel: Papel | undefined;
  unidade: Unidade;
  tema: Tema;
  alternarTema: () => void;
  /** Verifica permissão do usuário ativo. */
  pode: (permissao: Permissao) => boolean;
  podeVerModulo: (modulo: Modulo) => boolean;
  /** Registra na trilha de auditoria. */
  auditar: (acao: string, entidade: string, entidadeId: string, detalhe: string) => void;
}

const Contexto = createContext<ContextoBancada | null>(null);

const CHAVE_TEMA = 'bancada:tema';
const CHAVE_USUARIO = 'bancada:usuario';

function lerPreferencia(chave: string): string | null {
  try { return localStorage.getItem(chave); } catch { return null; }
}
function gravarPreferencia(chave: string, valor: string): void {
  try { localStorage.setItem(chave, valor); } catch { /* modo privativo */ }
}

export function BancadaProvider({ children }: { children: ReactNode }) {
  const [estado, despachar] = useReducer(redutor, undefined, () => {
    const base = estadoInicial();
    const salvo = lerPreferencia(CHAVE_USUARIO);
    if (salvo && base.usuarios.some((u) => u.id === salvo)) {
      return { ...base, usuarioAtualId: salvo };
    }
    return base;
  });

  const [tema, setTema] = useState<Tema>(() =>
    (lerPreferencia(CHAVE_TEMA) as Tema) ?? 'dark');

  useEffect(() => { gravarPreferencia(CHAVE_TEMA, tema); }, [tema]);
  useEffect(() => { gravarPreferencia(CHAVE_USUARIO, estado.usuarioAtualId); }, [estado.usuarioAtualId]);

  const usuario = useMemo(
    () => estado.usuarios.find((u) => u.id === estado.usuarioAtualId) ?? estado.usuarios[0],
    [estado.usuarios, estado.usuarioAtualId],
  );
  const papel = useMemo(
    () => estado.papeis.find((p) => p.id === usuario.papelId),
    [estado.papeis, usuario.papelId],
  );
  const unidade = useMemo(
    () => estado.unidades.find((u) => u.id === estado.unidadeAtivaId) ?? estado.unidades[0],
    [estado.unidades, estado.unidadeAtivaId],
  );

  const pode = useCallback(
    (permissao: Permissao) => papel?.permissoes.includes(permissao) ?? false,
    [papel],
  );
  const podeVerModulo = useCallback(
    (modulo: Modulo) => pode(`${modulo}:ver`),
    [pode],
  );

  const auditar = useCallback(
    (acao: string, entidade: string, entidadeId: string, detalhe: string) => {
      despachar({
        tipo: 'auditar',
        registro: {
          id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          data: new Date().toISOString(),
          usuarioId: usuario.id,
          acao, entidade, entidadeId, detalhe,
          ip: '10.0.0.1',
        },
      });
    },
    [usuario.id],
  );

  const alternarTema = useCallback(() => {
    setTema((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const valor = useMemo<ContextoBancada>(
    () => ({ estado, despachar, usuario, papel, unidade, tema, alternarTema, pode, podeVerModulo, auditar }),
    [estado, usuario, papel, unidade, tema, alternarTema, pode, podeVerModulo, auditar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useBancada(): ContextoBancada {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useBancada precisa estar dentro de <BancadaProvider>.');
  return ctx;
}

/* ---------------- Índices e seletores ---------------- */

export function useIndices() {
  const { estado } = useBancada();
  return useMemo(() => ({
    clientePorId: new Map(estado.clientes.map((c) => [c.id, c])),
    usuarioPorId: new Map(estado.usuarios.map((u) => [u.id, u])),
    parametroPorId: new Map(estado.parametros.map((p) => [p.id, p])),
    grupoPorId: new Map(estado.grupos.map((g) => [g.id, g])),
    tipoAnalisePorId: new Map(estado.tiposAnalise.map((t) => [t.id, t])),
    amostraPorId: new Map(estado.amostras.map((a) => [a.id, a])),
    equipamentoPorId: new Map(estado.equipamentos.map((e) => [e.id, e])),
    loteRecepcaoPorId: new Map(estado.lotesRecepcao.map((l) => [l.id, l])),
    leituraPorId: new Map(estado.leiturasPh.map((l) => [l.id, l])),
    controlePorId: new Map(estado.amostrasControle.map((c) => [c.id, c])),
    ensaiosPorAmostra: estado.ensaios.reduce((mapa, e) => {
      const lista = mapa.get(e.amostraId);
      if (lista) lista.push(e); else mapa.set(e.amostraId, [e]);
      return mapa;
    }, new Map<UUID, Ensaio[]>()),
  }), [estado]);
}

/** Calibração vigente de um pHmetro, ou a mais recente se nenhuma estiver válida. */
export function useCalibracaoVigente(equipamentoId: UUID | undefined): Calibracao | undefined {
  const { estado } = useBancada();
  return useMemo(() => {
    if (!equipamentoId) return undefined;
    const doEquipamento = estado.calibracoes
      .filter((c) => c.equipamentoId === equipamentoId)
      .sort((a, b) => +new Date(b.data) - +new Date(a.data));
    return doEquipamento.find((c) => c.status === 'valida') ?? doEquipamento[0];
  }, [estado.calibracoes, equipamentoId]);
}

/* ---------------- Ações de alto nível ---------------- */

export function useAcoes() {
  const { despachar, usuario, auditar, estado } = useBancada();

  const registrarLeitura = useCallback((leitura: LeituraPh, valorFinal: number) => {
    despachar({ tipo: 'registrar-leitura', leitura, valor: valorFinal });
    const amostra = estado.amostras.find((a) => a.id === leitura.amostraId);
    auditar(
      'Registrou leitura de pH', 'LeituraPh', leitura.id,
      `${amostra?.protocolo ?? leitura.amostraId} · pH ${valorFinal.toFixed(2)} · origem ${leitura.origem}`,
    );
    if (amostra && (amostra.status === 'recebida' || amostra.status === 'preparo')) {
      despachar({ tipo: 'atualizar-amostra', amostraId: amostra.id, dados: { status: 'em-analise' } });
    }
  }, [despachar, auditar, estado.amostras]);

  const salvarCalibracao = useCallback((
    equipamentoId: UUID, pontos: PontoCalibracao[], observacao?: string,
  ): Calibracao => {
    const r = calcularCalibracao(pontos);
    const agora = new Date();
    const validade = new Date(agora);
    validade.setHours(validade.getHours() + 12);

    const calibracao: Calibracao = {
      id: `cal-${Date.now()}`,
      equipamentoId,
      analistaId: usuario.id,
      data: agora.toISOString(),
      pontos,
      slopePercentual: r.slopePercentual,
      offsetMv: r.offsetMv,
      slopeMvPorPh: r.slopeMvPorPh,
      r2: r.r2,
      status: r.aprovada ? 'valida' : 'reprovada',
      validaAte: validade.toISOString(),
      observacao: observacao ?? r.avisos[0],
    };
    despachar({ tipo: 'salvar-calibracao', calibracao });
    auditar(
      r.aprovada ? 'Calibrou equipamento' : 'Reprovou calibração', 'Calibracao', calibracao.id,
      `${pontos.length} pontos · slope ${r.slopePercentual.toFixed(1)}% · offset ${r.offsetMv.toFixed(1)} mV`,
    );
    return calibracao;
  }, [despachar, usuario.id, auditar]);

  /** Lançamento em lote da bancada: várias amostras, vários elementos, uma gravação. */
  const lancarResultados = useCallback((entradas: Array<{ ensaioId: UUID; valor: number }>) => {
    if (entradas.length === 0) return;
    despachar({ tipo: 'lancar-resultados', entradas, analistaId: usuario.id });
    auditar(
      'Lançou resultados', 'Ensaio', `${entradas.length} ensaios`,
      `Lançamento em lote de ${entradas.length} ${entradas.length === 1 ? 'resultado' : 'resultados'}`,
    );
  }, [despachar, usuario.id, auditar]);

  const aprovarEnsaio = useCallback((ensaioId: UUID) => {
    despachar({
      tipo: 'atualizar-ensaio',
      ensaioId,
      dados: { status: 'aprovado', revisorId: usuario.id, dataAprovacao: new Date().toISOString() },
    });
    auditar('Aprovou resultado', 'Ensaio', ensaioId, 'Resultado liberado após revisão técnica');
  }, [despachar, usuario.id, auditar]);

  const repetirEnsaio = useCallback((ensaioId: UUID, motivo: string) => {
    despachar({
      tipo: 'atualizar-ensaio',
      ensaioId,
      dados: { status: 'repetir', valor: undefined, observacao: motivo },
    });
    auditar('Solicitou repetição', 'Ensaio', ensaioId, motivo);
  }, [despachar, auditar]);

  const mudarStatusAmostra = useCallback((amostraId: UUID, status: StatusAmostra) => {
    despachar({ tipo: 'atualizar-amostra', amostraId, dados: { status } });
    auditar('Alterou status da amostra', 'Amostra', amostraId, `Novo status: ${status}`);
  }, [despachar, auditar]);

  const registrarCQ = useCallback((
    controleId: UUID, equipamentoId: UUID, valorMedido: number,
  ): RegistroCQ => {
    const controle = estado.amostrasControle.find((c) => c.id === controleId)!;
    const historico = [
      ...estado.registrosCQ
        .filter((r) => r.controleId === controleId)
        .sort((a, b) => +new Date(a.data) - +new Date(b.data))
        .slice(-9)
        .map((r) => r.valorMedido),
      valorMedido,
    ];
    const av = avaliarCQ(historico, controle.valorAlvo, controle.desvioPadrao);
    const registro: RegistroCQ = {
      id: `rcq-${Date.now()}`,
      controleId, equipamentoId,
      analistaId: usuario.id,
      data: new Date().toISOString(),
      valorMedido,
      zScore: av.zScore,
      resultado: av.resultado,
      regraViolada: av.regraViolada,
    };
    despachar({ tipo: 'registrar-cq', registro });
    auditar('Registrou controle de qualidade', 'RegistroCQ', registro.id, av.mensagem);
    return registro;
  }, [despachar, estado.amostrasControle, estado.registrosCQ, usuario.id, auditar]);

  const emitirLaudo = useCallback((laudoId: UUID) => {
    despachar({
      tipo: 'atualizar-laudo',
      laudoId,
      dados: {
        status: 'emitido',
        emitidoEm: new Date().toISOString(),
        assinadoPorId: usuario.id,
        hashDocumento: Math.random().toString(16).slice(2, 14),
      },
    });
    auditar('Emitiu laudo', 'Laudo', laudoId, 'Laudo assinado digitalmente pelo responsável técnico');
  }, [despachar, usuario.id, auditar]);

  const emitirNota = useCallback((
    clienteId: UUID, valorServicos: number, aliquotaIss: number,
    codigoServico: string, discriminacao: string, laudoIds: UUID[] = [],
  ) => {
    const ap = apurarNotaServico({
      valorServicos, aliquotaIss, issRetido: false,
      regime: 'presumido', tomadorPessoaJuridica: true,
    });
    const agora = new Date();
    const nota: NotaFiscal = {
      id: `nf-${Date.now()}`,
      modelo: 'NFS-e',
      numero: String(9000 + Math.floor(Math.random() * 999)),
      serie: 'A1',
      clienteId,
      emissao: agora.toISOString(),
      competencia: agora.toISOString().slice(0, 7),
      status: 'em-processamento',
      codigoServico,
      discriminacao,
      valorServicos,
      deducoes: 0,
      baseCalculo: ap.baseCalculo,
      aliquotaIss,
      valorIss: ap.valorIss,
      issRetido: false,
      valorIr: ap.valorIr,
      valorPis: ap.valorPis,
      valorCofins: ap.valorCofins,
      valorCsll: ap.valorCsll,
      valorInss: ap.valorInss,
      valorLiquido: ap.valorLiquido,
      laudoIds,
    };
    const vencimento = new Date(agora);
    vencimento.setDate(vencimento.getDate() + 28);
    const titulo: Titulo = {
      id: `tit-${Date.now()}`,
      tipo: 'receber',
      numero: `REC${nota.numero}`,
      clienteId,
      descricao: `NFS-e ${nota.numero}`,
      categoria: 'Análises laboratoriais',
      emissao: agora.toISOString(),
      vencimento: vencimento.toISOString(),
      valor: ap.valorLiquido,
      valorPago: 0,
      status: 'aberto',
      notaFiscalId: nota.id,
    };
    despachar({ tipo: 'criar-nota', nota, titulo });
    auditar('Emitiu NFS-e', 'NotaFiscal', nota.id, `Nota ${nota.numero} enviada à prefeitura`);
    return nota;
  }, [despachar, auditar]);

  const baixarTitulo = useCallback((tituloId: UUID) => {
    const t = estado.titulos.find((x) => x.id === tituloId);
    despachar({
      tipo: 'atualizar-titulo',
      tituloId,
      dados: { status: 'pago', pagamento: new Date().toISOString(), valorPago: t?.valor ?? 0 },
    });
    auditar('Baixou título', 'Titulo', tituloId, `Título ${t?.numero ?? tituloId} quitado`);
  }, [despachar, estado.titulos, auditar]);

  const moverOportunidade = useCallback((oportunidadeId: UUID, estagio: Oportunidade['estagio']) => {
    despachar({ tipo: 'mover-oportunidade', oportunidadeId, estagio });
    auditar('Moveu oportunidade', 'Oportunidade', oportunidadeId, `Novo estágio: ${estagio}`);
  }, [despachar, auditar]);

  const movimentarEstoque = useCallback((
    itemId: UUID, tipo: MovimentoEstoque['tipo'], quantidade: number, motivo: string,
  ) => {
    despachar({
      tipo: 'movimentar-estoque',
      movimento: {
        id: `mov-${Date.now()}`,
        itemId, tipo, quantidade,
        data: new Date().toISOString(),
        usuarioId: usuario.id,
        motivo,
      },
    });
    auditar('Movimentou estoque', 'ItemEstoque', itemId, `${tipo} de ${quantidade} — ${motivo}`);
  }, [despachar, usuario.id, auditar]);

  const salvarUsuario = useCallback((u: Usuario) => {
    despachar({ tipo: 'salvar-usuario', usuario: u });
    auditar('Salvou usuário', 'Usuario', u.id, `${u.nome} — papel ${u.papelId}`);
  }, [despachar, auditar]);

  const salvarPapel = useCallback((p: Papel) => {
    despachar({ tipo: 'salvar-papel', papel: p });
    auditar('Alterou permissões', 'Papel', p.id, `${p.nome} — ${p.permissoes.length} permissões`);
  }, [despachar, auditar]);

  const salvarCurva = useCallback((c: Curva) => {
    despachar({ tipo: 'salvar-curva', curva: c });
    auditar('Salvou curva de calibração', 'Curva', c.id,
      `${c.codigo} · R² ${c.r2.toFixed(5)} · ${c.pontos.filter((p) => !p.descartado).length} pontos`);
  }, [despachar, auditar]);

  const salvarLegenda = useCallback((l: Legenda) => {
    despachar({ tipo: 'salvar-legenda', legenda: l });
    auditar('Salvou legenda', 'Legenda', l.id, `${l.codigo} · ${l.faixas.length} faixas`);
  }, [despachar, auditar]);

  const salvarCliente = useCallback((c: Cliente) => {
    despachar({ tipo: 'salvar-cliente', cliente: c });
    auditar('Salvou cliente', 'Cliente', c.id, c.nome);
  }, [despachar, auditar]);

  const criarRecepcao = useCallback((
    lote: LoteRecepcao, novasAmostras: Amostra[], novosEnsaios: Ensaio[],
  ) => {
    despachar({ tipo: 'criar-recepcao', lote, amostras: novasAmostras, ensaios: novosEnsaios });
    auditar('Protocolou recepção', 'LoteRecepcao', lote.id,
      `${lote.numero} · ${novasAmostras.length} amostras · ${novosEnsaios.length} ensaios`);
  }, [despachar, auditar]);

  const trocarUsuario = useCallback((usuarioId: UUID) => {
    despachar({ tipo: 'trocar-usuario', usuarioId });
  }, [despachar]);

  const trocarUnidade = useCallback((unidadeId: UUID) => {
    despachar({ tipo: 'trocar-unidade', unidadeId });
  }, [despachar]);

  return {
    registrarLeitura, salvarCalibracao, lancarResultados, aprovarEnsaio, repetirEnsaio,
    mudarStatusAmostra, registrarCQ, emitirLaudo, emitirNota, baixarTitulo,
    moverOportunidade, movimentarEstoque, salvarUsuario, salvarPapel,
    salvarCliente, salvarCurva, salvarLegenda, criarRecepcao, trocarUsuario, trocarUnidade,
  };
}

/** Lista de ensaios de pH esperando bancada — alimenta a fila da estação. */
export function useFilaPh() {
  const { estado } = useBancada();
  return useMemo(() => {
    const phIds = new Set(estado.parametros.filter((p) => p.ehPh).map((p) => p.id));
    return estado.ensaios
      .filter((e) => phIds.has(e.parametroId) && (e.status === 'pendente' || e.status === 'em-bancada' || e.status === 'repetir'))
      .map((e) => ({
        ensaio: e,
        amostra: estado.amostras.find((a) => a.id === e.amostraId)!,
        parametro: estado.parametros.find((p) => p.id === e.parametroId)!,
      }))
      .filter((x) => x.amostra && x.amostra.status !== 'cancelada')
      .sort((a, b) => {
        const peso = { emergencial: 0, urgente: 1, normal: 2 } as const;
        const d = peso[a.amostra.prioridade] - peso[b.amostra.prioridade];
        if (d !== 0) return d;
        return +new Date(a.amostra.prazoEntrega) - +new Date(b.amostra.prazoEntrega);
      });
  }, [estado.ensaios, estado.amostras, estado.parametros]);
}
