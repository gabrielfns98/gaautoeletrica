/* ============================================================
   BANCADA — módulo de pH
   Reúne bancada, calibração, controle de qualidade e importação.
   ============================================================ */

import { useMemo, useState } from 'react';

import { CabecalhoPagina, Pilula, Segmentos } from '../../components/primitivos';
import { useBancada, useFilaPh } from '../../data/store';
import { CRITERIOS } from '../../lib/ph';
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

  const calibracoesVigentes = useMemo(() => {
    const agora = new Date();
    return estado.equipamentos
      .filter((e) => e.tipo === 'phmetro' && e.ativo)
      .map((e) => {
        const c = estado.calibracoes
          .filter((x) => x.equipamentoId === e.id)
          .sort((a, b) => +new Date(b.data) - +new Date(a.data))[0];
        return { equipamento: e, calibracao: c, ok: c?.status === 'valida' && new Date(c.validaAte) > agora };
      });
  }, [estado.equipamentos, estado.calibracoes]);

  const semCalibracao = calibracoesVigentes.filter((c) => !c.ok).length;

  return (
    <>
      <CabecalhoPagina
        eyebrow="Potenciometria"
        titulo="Leitura de pH"
        descricao="Estação de bancada integrada ao potenciômetro: calibração rastreável, captura automática na estabilização, réplicas com controle de RSD e carta de controle."
        acoes={
          <>
            <Pilula tom={fila.length > 0 ? 'primario' : 'neutro'} pontinho>
              {fila.length} na fila
            </Pilula>
            <Pilula tom={semCalibracao === 0 ? 'sucesso' : 'alerta'} pontinho>
              {semCalibracao === 0
                ? 'Todos os pHmetros calibrados'
                : `${semCalibracao} ${semCalibracao === 1 ? 'pHmetro' : 'pHmetros'} sem calibração válida`}
            </Pilula>
          </>
        }
      >
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Segmentos
            valor={aba}
            aoMudar={setAba}
            opcoes={[
              { valor: 'bancada', rotulo: 'Bancada', contagem: fila.length },
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
