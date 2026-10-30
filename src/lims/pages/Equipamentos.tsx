/* ============================================================
   BANCADA — parque de equipamentos e metrologia
   ============================================================ */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Gauge, Wrench } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import { useBancada } from '../data/store';
import { CRITERIOS } from '../lib/ph';
import { podeLer, situacaoMetrologica } from '../lib/equipamento';
import { data as fData, dataHora, diasAte, numero, tempoRelativo } from '../lib/format';
import {
  BarraFiltros, CabecalhoPagina, Campos, Indicador, Pilula, Secao, Tabela, Vazio, filtrar,
} from '../components/primitivos';
import type { Calibracao, Equipamento } from '../types';
import { rota } from '../base';

const ROTULO_VERIFICACAO: Record<string, string> = {
  'calibracao-multiponto': 'Calibração multiponto',
  'curva-analitica': 'Curva analítica',
  'massa-padrao': 'Massa padrão',
  'padrao-de-verificacao': 'Padrão de verificação',
  temperatura: 'Termômetro aferido',
  nenhuma: '—',
};

export default function Equipamentos() {
  const { estado, unidade } = useBancada();
  const [busca, setBusca] = useState('');

  const tipoPorId = useMemo(
    () => new Map(estado.tiposEquipamento.map((t) => [t.id, t])),
    [estado.tiposEquipamento],
  );

  const comEstado = useMemo(() => {
    const agora = new Date();
    return estado.equipamentos.map((e) => {
      const calibracao = estado.calibracoes
        .filter((c) => c.equipamentoId === e.id)
        .sort((a, b) => +new Date(b.data) - +new Date(a.data))[0];
      const tipo = tipoPorId.get(e.tipo);

      /* O potenciômetro continua julgado pela própria calibração, que
         tem slope e offset; os demais, pela verificação metrológica
         genérica. A liberação para ler é a mesma pergunta para todos. */
      const ehPh = tipo?.verificacao === 'calibracao-multiponto';
      const situacao = situacaoMetrologica(e.id, estado.verificacoesEquipamento, agora);
      const calibracaoOk = calibracao
        ? calibracao.status === 'valida' && new Date(calibracao.validaAte) > agora
        : undefined;

      return {
        equipamento: e,
        tipo,
        calibracao,
        calibracaoOk,
        situacao,
        liberacao: ehPh
          ? { permitido: calibracaoOk !== false, motivo: calibracaoOk === false ? `A calibração de ${e.tag} não está válida.` : undefined }
          : podeLer(e, tipo, estado.verificacoesEquipamento, agora),
        manutencaoVencida: diasAte(e.proximaManutencao) < 0,
        manutencaoProxima: diasAte(e.proximaManutencao) >= 0 && diasAte(e.proximaManutencao) <= 30,
      };
    });
  }, [estado.equipamentos, estado.calibracoes, estado.verificacoesEquipamento, tipoPorId]);

  const phmetros = comEstado.filter((x) => x.equipamento.tipo === 'phmetro');
  const outros = comEstado.filter((x) => x.equipamento.tipo !== 'phmetro');
  /* Só entra aqui quem tem rito de verificação: agitador não se verifica. */
  const comVerificacao = outros.filter((x) => x.tipo && x.tipo.verificacao !== 'nenhuma');

  const kpis = useMemo(() => ({
    total: estado.equipamentos.length,
    bloqueados: comEstado.filter((x) => !x.liberacao.permitido).length,
    manutencaoVencida: comEstado.filter((x) => x.manutencaoVencida).length,
    eletrodosVelhos: phmetros.filter((x) => {
      const el = x.equipamento.eletrodo;
      if (!el) return false;
      const meses = -diasAte(el.dataInstalacao) / 30;
      return meses > el.vidaUtilMeses * 0.75;
    }).length,
  }), [estado.equipamentos, phmetros, comEstado]);

  return (
    <>
      <CabecalhoPagina
        eyebrow="Metrologia"
        titulo="Equipamentos"
        descricao="Parque instalado, controle metrológico de todo aparelho que gera resultado e cronograma de manutenção preventiva."
        acoes={
          <Button asChild variant="outline" className="gap-2">
            <Link to={rota('/ph')}><Gauge className="h-4 w-4" /> Calibrar pHmetro</Link>
          </Button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador rotulo="Equipamentos" valor={kpis.total} detalhe={`${phmetros.length} potenciômetros`} />
        <Indicador rotulo="Bloqueados para leitura" valor={kpis.bloqueados} destaque={kpis.bloqueados > 0} detalhe="verificação vencida ou reprovada" />
        <Indicador rotulo="Manutenção vencida" valor={kpis.manutencaoVencida} destaque={kpis.manutencaoVencida > 0} icone={Wrench} />
        <Indicador rotulo="Eletrodos no fim da vida" valor={kpis.eletrodosVelhos} detalhe="acima de 75% da vida útil" />
      </div>

      <h2 className="label-micro mb-3">Potenciômetros</h2>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {phmetros.map(({ equipamento, calibracao, calibracaoOk, manutencaoVencida }) => {
          const el = equipamento.eletrodo;
          const mesesEletrodo = el ? -diasAte(el.dataInstalacao) / 30 : 0;
          const usoEletrodo = el ? Math.min(100, (mesesEletrodo / el.vidaUtilMeses) * 100) : 0;

          return (
            <div key={equipamento.id} className="panel relative overflow-hidden p-5">
              <span
                className="absolute inset-x-0 top-0 h-0.5"
                style={{ background: calibracaoOk ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}
                aria-hidden
              />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="num text-sm font-semibold text-foreground">{equipamento.tag}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {equipamento.fabricante} {equipamento.modelo}
                  </p>
                  <p className="num mt-0.5 text-[0.66rem] text-muted-foreground/70">
                    s/n {equipamento.numeroSerie} · {equipamento.setor}
                  </p>
                </div>
                <Pilula tom={calibracaoOk ? 'sucesso' : 'erro'} pontinho>
                  {calibracaoOk ? 'calibrado' : 'sem calibração'}
                </Pilula>
              </div>

              {calibracao && (
                <div className="panel-sunken mt-4 grid grid-cols-3 gap-3 p-3.5">
                  <div>
                    <p className="label-micro mb-1">Slope</p>
                    <p className={cn('num text-sm font-medium', calibracao.slopePercentual < CRITERIOS.slopeMin ? 'text-destructive' : 'text-foreground')}>
                      {numero(calibracao.slopePercentual, 1)}%
                    </p>
                  </div>
                  <div>
                    <p className="label-micro mb-1">Offset</p>
                    <p className={cn('num text-sm font-medium', Math.abs(calibracao.offsetMv) > CRITERIOS.offsetMaxMv ? 'text-destructive' : 'text-foreground')}>
                      {numero(calibracao.offsetMv, 1)} mV
                    </p>
                  </div>
                  <div>
                    <p className="label-micro mb-1">Última</p>
                    <p className="num text-sm font-medium text-foreground">{tempoRelativo(calibracao.data)}</p>
                  </div>
                </div>
              )}

              {el && (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-[0.68rem]">
                    <span className="text-muted-foreground">Eletrodo {el.modelo}</span>
                    <span className="num text-foreground">{numero(mesesEletrodo, 0)} de {el.vidaUtilMeses} meses</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[hsl(var(--surface-sunken))]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${usoEletrodo}%`,
                        background: usoEletrodo > 90 ? 'hsl(var(--destructive))' : usoEletrodo > 75 ? 'hsl(var(--warning))' : 'hsl(var(--primary))',
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center gap-2 border-t border-[hsl(var(--line-soft))] pt-3.5 text-[0.68rem]">
                <CalendarClock className={cn('h-3.5 w-3.5', manutencaoVencida ? 'text-destructive' : 'text-muted-foreground')} />
                <span className={manutencaoVencida ? 'text-destructive' : 'text-muted-foreground'}>
                  Manutenção {manutencaoVencida ? 'vencida em' : 'prevista para'} {fData(equipamento.proximaManutencao)}
                </span>
                {equipamento.protocolo && (
                  <span className="num ml-auto text-muted-foreground/70">
                    {equipamento.protocolo} · {equipamento.baudRate} baud
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {comVerificacao.length > 0 && (
        <>
          <h2 className="label-micro mb-3">Controle metrológico</h2>
          <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {comVerificacao.map(({ equipamento, tipo, situacao, liberacao }) => (
              <div key={equipamento.id} className="panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="num text-xs font-semibold text-foreground">{equipamento.tag}</p>
                    <p className="truncate text-[0.68rem] text-muted-foreground">{tipo?.nome}</p>
                  </div>
                  <Pilula
                    tom={!liberacao.permitido ? 'erro' : situacao.vencendo ? 'alerta' : 'sucesso'}
                    pontinho
                    className="shrink-0 px-1.5 py-0 text-[0.6rem]"
                  >
                    {!liberacao.permitido ? 'bloqueado' : situacao.vencendo ? 'vence logo' : 'liberado'}
                  </Pilula>
                </div>

                <div className="panel-sunken mt-3 grid grid-cols-2 gap-3 p-3">
                  <div>
                    <p className="label-micro mb-1">Verificação</p>
                    <p className="text-[0.68rem] text-foreground">{ROTULO_VERIFICACAO[tipo!.verificacao]}</p>
                  </div>
                  <div>
                    <p className="label-micro mb-1">Validade</p>
                    <p className="num text-[0.68rem] text-foreground">
                      {situacao.semHistorico
                        ? 'nunca verificado'
                        : situacao.vencida
                          ? `venceu há ${Math.abs(situacao.diasParaVencer ?? 0)} d`
                          : `${situacao.diasParaVencer} d`}
                    </p>
                  </div>
                  {situacao.ultima?.r2 !== undefined && (
                    <div>
                      <p className="label-micro mb-1">R² da curva</p>
                      <p className="num text-[0.68rem] text-foreground">{numero(situacao.ultima.r2, 5)}</p>
                    </div>
                  )}
                  {situacao.ultima?.erroPercentual !== undefined && (
                    <div>
                      <p className="label-micro mb-1">Erro</p>
                      <p className="num text-[0.68rem] text-foreground">
                        {numero(situacao.ultima.erroPercentual, 3)}%
                      </p>
                    </div>
                  )}
                </div>

                {!liberacao.permitido && (
                  <p className="mt-2.5 text-[0.66rem] leading-relaxed text-[hsl(var(--danger))]">
                    {liberacao.motivo}
                  </p>
                )}
                {situacao.ultima && liberacao.permitido && (
                  <p className="mt-2.5 text-[0.66rem] text-muted-foreground">
                    Última {tempoRelativo(situacao.ultima.data)} · {situacao.ultima.resultado}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <Secao titulo="Parque completo" semPadding>
          <div className="px-5 pt-5">
            <BarraFiltros busca={busca} aoBuscar={setBusca} placeholder="Buscar por tag, fabricante, modelo ou setor…" />
          </div>
          <Tabela
            colunas={[
              { chave: 'tag', titulo: 'Tag', valor: (e) => e.tag, render: (e) => <span className="num text-xs font-medium">{e.tag}</span> },
              {
                chave: 'nome', titulo: 'Equipamento', valor: (e) => e.nome,
                render: (e) => (
                  <span className="block min-w-0">
                    <span className="block truncate text-xs text-foreground">{e.nome}</span>
                    <span className="block truncate text-[0.66rem] text-muted-foreground">{e.fabricante} {e.modelo}</span>
                  </span>
                ),
              },
              { chave: 'setor', titulo: 'Setor', secundaria: true, render: (e) => <span className="text-xs text-muted-foreground">{e.setor}</span> },
              { chave: 'serie', titulo: 'Série', secundaria: true, render: (e) => <span className="num text-xs text-muted-foreground">{e.numeroSerie}</span> },
              {
                chave: 'manutencao', titulo: 'Próxima manutenção', alinhamento: 'direita', valor: (e) => e.proximaManutencao,
                render: (e) => {
                  const d = diasAte(e.proximaManutencao);
                  return (
                    <span className={cn('num text-xs', d < 0 ? 'text-destructive' : d <= 30 ? 'text-[hsl(var(--warning))]' : 'text-muted-foreground')}>
                      {fData(e.proximaManutencao)}
                    </span>
                  );
                },
              },
              {
                chave: 'status', titulo: '', alinhamento: 'direita',
                render: (e) => (
                  <Pilula tom={e.ativo ? 'sucesso' : 'neutro'} className="px-1.5 py-0 text-[0.62rem]">
                    {e.ativo ? 'ativo' : 'inativo'}
                  </Pilula>
                ),
              },
            ]}
            dados={filtrar(estado.equipamentos, busca, (e) => [e.tag, e.nome, e.fabricante, e.modelo, e.setor, e.numeroSerie])}
            chaveDe={(e) => e.id}
            ordenacaoInicial={{ chave: 'tag', direcao: 'asc' }}
            vazio={<Vazio icone={Wrench} titulo="Nenhum equipamento encontrado" />}
          />
        </Secao>

        <div className="space-y-5">
          <Secao titulo="Calibrações recentes" semPadding>
            <Tabela
              denso
              colunas={[
                { chave: 'eq', titulo: 'Equip.', render: (c) => <span className="num text-xs">{estado.equipamentos.find((e) => e.id === c.equipamentoId)?.tag}</span> },
                { chave: 'data', titulo: 'Data', render: (c) => <span className="num text-xs text-muted-foreground">{dataHora(c.data)}</span> },
                { chave: 'slope', titulo: 'Slope', alinhamento: 'direita', render: (c) => <span className={cn('num text-xs', c.slopePercentual < CRITERIOS.slopeMin && 'text-destructive')}>{numero(c.slopePercentual, 1)}%</span> },
              ]}
              dados={[...estado.calibracoes].sort((a, b) => +new Date(b.data) - +new Date(a.data)).slice(0, 14)}
              chaveDe={(c) => c.id}
            />
          </Secao>

          <Secao titulo="Outros equipamentos">
            <ul className="space-y-3">
              {outros.map(({ equipamento, manutencaoVencida, manutencaoProxima }) => (
                <li key={equipamento.id} className="panel-sunken p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="num text-xs font-medium text-foreground">{equipamento.tag}</p>
                      <p className="truncate text-[0.68rem] text-muted-foreground">{equipamento.nome}</p>
                    </div>
                    {(manutencaoVencida || manutencaoProxima) && (
                      <Pilula tom={manutencaoVencida ? 'erro' : 'alerta'} className="shrink-0 px-1.5 py-0 text-[0.58rem]">
                        {manutencaoVencida ? 'vencida' : 'em breve'}
                      </Pilula>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Secao>

          <Secao titulo="Responsável técnico">
            <Campos
              colunas={1}
              itens={[
                { rotulo: 'Nome', valor: unidade.responsavelTecnico },
                { rotulo: 'Registro', valor: <span className="num">{unidade.crq}</span> },
                { rotulo: 'Acreditação', valor: <span className="text-xs">{unidade.acreditacao}</span> },
                { rotulo: 'Analistas habilitados', valor: <span className="num">{estado.usuarios.filter((u) => u.habilitacoes.length > 0).length}</span> },
              ]}
            />
          </Secao>
        </div>
      </div>
    </>
  );
}
