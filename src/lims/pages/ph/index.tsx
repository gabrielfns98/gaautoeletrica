/* ============================================================
   BANCADA — aquisição de bancada

   O potenciômetro é um aparelho entre vários, não o produto. Esta
   tela é a estação de aquisição do laboratório: quem tem driver
   lê direto, quem não tem entra por importação ou digitação, e o
   controle metrológico vale para todos.
   ============================================================ */

import { useMemo, useState } from 'react';

import { CabecalhoPagina, Pilula, Segmentos } from '../../components/primitivos';
import { useBancada, useFilaPh } from '../../data/store';
import { CRITERIOS } from '../../lib/ph';
import { podeLer } from '../../lib/equipamento';
import { numero } from '../../lib/format';

import Bancada from './Bancada';
import Calibracao from './Calibracao';
import ControleQualidade from './ControleQualidade';
import Importacao from './Importacao';

type Aba = 'bancada' | 'calibracao' | 'cq' | 'importacao';

export default function EstacaoPh() {
  const [aba, setAba] = useState<Aba>('bancada');
  const { estado } = useBancada();
  const fila = useFilaPh();

  /* Quantos aparelhos do parque estão impedidos de ler agora — de
     qualquer família, não só os potenciômetros. */
  const bloqueados = useMemo(() => {
    const agora = new Date();
    const tipoPorId = new Map(estado.tiposEquipamento.map((t) => [t.id, t]));

    return estado.equipamentos.filter((e) => {
      if (!e.ativo) return false;
      const tipo = tipoPorId.get(e.tipo);
      if (!tipo || tipo.verificacao === 'nenhuma') return false;

      if (tipo.verificacao === 'calibracao-multiponto') {
        const c = estado.calibracoes
          .filter((x) => x.equipamentoId === e.id)
          .sort((a, b) => +new Date(b.data) - +new Date(a.data))[0];
        return !(c?.status === 'valida' && new Date(c.validaAte) > agora);
      }
      return !podeLer(e, tipo, estado.verificacoesEquipamento, agora).permitido;
    }).length;
  }, [estado.equipamentos, estado.calibracoes, estado.tiposEquipamento, estado.verificacoesEquipamento]);

  return (
    <>
      <CabecalhoPagina
        eyebrow="Aquisição"
        titulo="Bancada"
        descricao="Estação de aquisição do laboratório: o aparelho com driver entrega a leitura direto, o resto entra por importação ou digitação, e nenhum deles lê com verificação vencida."
        acoes={
          <>
            <Pilula tom={fila.length > 0 ? 'primario' : 'neutro'} pontinho>
              {fila.length} na fila
            </Pilula>
            <Pilula tom={bloqueados === 0 ? 'sucesso' : 'alerta'} pontinho>
              {bloqueados === 0
                ? 'Parque liberado para leitura'
                : `${bloqueados} ${bloqueados === 1 ? 'aparelho bloqueado' : 'aparelhos bloqueados'}`}
            </Pilula>
          </>
        }
      >
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Segmentos
            valor={aba}
            aoMudar={setAba}
            opcoes={[
              { valor: 'bancada', rotulo: 'Potenciometria', contagem: fila.length },
              { valor: 'calibracao', rotulo: 'Calibração' },
              { valor: 'cq', rotulo: 'Controle de qualidade' },
              { valor: 'importacao', rotulo: 'Importação' },
            ]}
          />
          {aba === 'bancada' && (
            <p className="text-xs text-muted-foreground">
              Captura automática com deriva ≤ {CRITERIOS.derivaMaxMvPorMin} mV/min · RSD máximo entre
              réplicas de {numero(CRITERIOS.rsdMaxPercentual, 0)}%
            </p>
          )}
        </div>
      </CabecalhoPagina>

      <div className="animate-fade-in">
        {aba === 'bancada' && <Bancada />}
        {aba === 'calibracao' && <Calibracao />}
        {aba === 'cq' && <ControleQualidade />}
        {aba === 'importacao' && <Importacao />}
      </div>
    </>
  );
}
