/* ============================================================
   BANCADA — importação de corrida do pHmetro
   Lê o arquivo exportado pelo instrumento, concilia cada linha
   com um ensaio pendente e grava a corrida inteira.
   ============================================================ */

import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, CircleAlert, FileUp, Upload, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { useAcoes, useBancada, useCalibracaoVigente, useFilaPh } from '../../data/store';
import { importarCsv } from '../../lib/serial';
import type { LinhaImportada } from '../../lib/serial';
import { corrigirPara25C, mvDePh, phDeMv } from '../../lib/ph';
import { numero } from '../../lib/format';
import { ChipPh } from '../../components/ph-visual';
import { Pilula, Secao, Tabela, Vazio } from '../../components/primitivos';
import type { LeituraPh } from '../../types';

const EXEMPLO = `Protocolo;pH;Temp;mV
25.014533;5,42;24,8;93,1
25.014534;4,87;24,9;125,4
25.014535;6,13;25,1;51,7`;

interface LinhaConciliada extends LinhaImportada {
  ensaioId?: string;
  protocolo?: string;
  parametro?: string;
  phFinal?: number;
  situacao: 'pronta' | 'sem-par' | 'erro';
  detalhe: string;
}

export default function Importacao() {
  const { estado, usuario, pode } = useBancada();
  const { registrarLeitura } = useAcoes();
  const fila = useFilaPh();

  const phmetros = estado.equipamentos.filter((e) => e.tipo === 'phmetro' && e.ativo);
  const [equipamentoId, setEquipamentoId] = useState(phmetros[0]?.id ?? '');
  const [conteudo, setConteudo] = useState('');
  const calibracao = useCalibracaoVigente(equipamentoId);
  const inputArquivo = useRef<HTMLInputElement>(null);

  const linhas = useMemo<LinhaConciliada[]>(() => {
    if (!conteudo.trim() || !calibracao) return [];

    return importarCsv(conteudo).map((l) => {
      if (l.erro) {
        return { ...l, situacao: 'erro' as const, detalhe: l.erro };
      }

      // concilia pelo protocolo ou pela identificação de campo
      const alvo = fila.find((f) =>
        f.amostra.protocolo === l.identificacao ||
        f.amostra.protocolo.replace(/\D/g, '') === l.identificacao.replace(/\D/g, '') ||
        f.amostra.identificacaoCampo.toLowerCase() === l.identificacao.toLowerCase());

      if (!alvo) {
        return {
          ...l, situacao: 'sem-par' as const,
          detalhe: 'Nenhum ensaio de pH pendente com esta identificação',
        };
      }

      const temperatura = l.temperatura ?? 25;
      const ph = l.ph ?? (l.mV !== undefined ? phDeMv(l.mV, temperatura, calibracao) : NaN);
      if (!Number.isFinite(ph) || ph < 0 || ph > 14) {
        return { ...l, situacao: 'erro' as const, detalhe: 'pH fora da faixa analítica' };
      }

      const phFinal = corrigirPara25C(ph, temperatura, alvo.parametro.extrator ?? 'H2O');
      return {
        ...l,
        ensaioId: alvo.ensaio.id,
        protocolo: alvo.amostra.protocolo,
        parametro: alvo.parametro.nome,
        phFinal,
        situacao: 'pronta' as const,
        detalhe: `${alvo.parametro.nome} · normalizado para 25 °C`,
      };
    });
  }, [conteudo, fila, calibracao]);

  const prontas = linhas.filter((l) => l.situacao === 'pronta');

  const carregarArquivo = async (arquivo: File) => {
    const texto = await arquivo.text();
    setConteudo(texto);
    toast.info(`${arquivo.name} carregado`, { description: `${texto.split(/\r?\n/).filter(Boolean).length} linhas lidas.` });
  };

  const importar = () => {
    if (!calibracao || prontas.length === 0) return;
    for (const l of prontas) {
      const alvo = fila.find((f) => f.ensaio.id === l.ensaioId);
      if (!alvo || l.phFinal === undefined) continue;
      const temperatura = l.temperatura ?? 25;

      const leitura: LeituraPh = {
        id: `lph-imp-${Date.now()}-${l.linha}`,
        ensaioId: alvo.ensaio.id,
        amostraId: alvo.amostra.id,
        parametroId: alvo.parametro.id,
        equipamentoId,
        calibracaoId: calibracao.id,
        analistaId: usuario.id,
        origem: 'importacao',
        mV: l.mV ?? mvDePh(l.ph ?? l.phFinal, temperatura, calibracao),
        temperatura,
        phBruto: l.ph ?? l.phFinal,
        phCorrigido: l.phFinal,
        derivaMvPorMin: 0,
        estavel: true,
        tempoEstabilizacaoS: 0,
        extrator: (alvo.parametro.extrator ?? 'H2O') as LeituraPh['extrator'],
        proporcao: alvo.parametro.proporcao ?? '1:2,5',
        dataHora: new Date().toISOString(),
        observacao: `Importado do arquivo do instrumento, linha ${l.linha}`,
      };
      registrarLeitura(leitura, l.phFinal);
    }
    toast.success(`${prontas.length} resultados importados`, {
      description: 'Os ensaios passaram para o status “lido” e aguardam revisão técnica.',
    });
    setConteudo('');
  };

  if (!pode('ph:criar')) {
    return <Secao><Vazio icone={CircleAlert} titulo="Sem permissão para importar resultados" /></Secao>;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="space-y-5">
        <Secao
          titulo="Arquivo do instrumento"
          descricao="CSV ou TSV exportado pelo pHmetro. Separador e cabeçalho são detectados automaticamente."
          acoes={
            <>
              <input
                ref={inputArquivo} type="file" accept=".csv,.tsv,.txt" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void carregarArquivo(f); }}
              />
              <Button variant="outline" size="sm" onClick={() => inputArquivo.current?.click()} className="h-8 gap-1.5 text-xs">
                <FileUp className="h-3.5 w-3.5" /> Escolher arquivo
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConteudo(EXEMPLO)} className="h-8 text-xs">
                usar exemplo
              </Button>
            </>
          }
        >
          <Textarea
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            placeholder={EXEMPLO}
            rows={9}
            className="num resize-y bg-[hsl(var(--surface-sunken))] text-xs leading-relaxed"
          />
          <p className="mt-2.5 text-xs text-muted-foreground">
            Colunas reconhecidas: protocolo/amostra/id, pH, temperatura e mV. Quando só há mV, o pH é
            recalculado pela calibração vigente do equipamento selecionado.
          </p>
        </Secao>

        {linhas.length > 0 && (
          <Secao titulo="Conciliação" descricao={`${prontas.length} de ${linhas.length} linhas prontas para importar`} semPadding>
            <Tabela
              denso
              colunas={[
                { chave: 'linha', titulo: 'Linha', render: (l) => <span className="num text-xs text-muted-foreground">{l.linha}</span> },
                { chave: 'id', titulo: 'Identificação', render: (l) => <span className="num text-xs">{l.identificacao || '—'}</span> },
                { chave: 'lido', titulo: 'Lido', alinhamento: 'direita', render: (l) => <span className="num text-xs">{l.ph !== undefined ? numero(l.ph, 2) : l.mV !== undefined ? `${numero(l.mV, 1)} mV` : '—'}</span> },
                { chave: 'temp', titulo: '°C', alinhamento: 'direita', secundaria: true, render: (l) => <span className="num text-xs">{l.temperatura !== undefined ? numero(l.temperatura, 1) : '—'}</span> },
                { chave: 'final', titulo: 'pH a 25 °C', alinhamento: 'direita', render: (l) => <ChipPh valor={l.phFinal} tamanho="sm" /> },
                {
                  chave: 'situacao', titulo: 'Situação',
                  render: (l) => (
                    <div className="flex items-center gap-2">
                      {l.situacao === 'pronta' ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--success))]" />
                        : l.situacao === 'sem-par' ? <CircleAlert className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--warning))]" />
                        : <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />}
                      <span className={cn('text-xs', l.situacao === 'pronta' ? 'text-muted-foreground' : l.situacao === 'sem-par' ? 'text-[hsl(var(--warning))]' : 'text-destructive')}>
                        {l.detalhe}
                      </span>
                    </div>
                  ),
                },
              ]}
              dados={linhas}
              chaveDe={(l) => `${l.linha}-${l.identificacao}`}
            />
          </Secao>
        )}
      </div>

      <div className="space-y-5">
        <Secao titulo="Destino">
          <div className="space-y-4">
            <div>
              <Label className="label-micro mb-2 block">Equipamento de origem</Label>
              <Select value={equipamentoId} onValueChange={setEquipamentoId}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {phmetros.map((e) => <SelectItem key={e.id} value={e.id}>{e.tag} — {e.modelo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {calibracao && (
              <div className="panel-sunken p-3.5">
                <p className="label-micro mb-2">Calibração aplicada</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="num text-sm font-medium text-foreground">{numero(calibracao.slopePercentual, 1)}%</p>
                    <p className="label-micro">slope</p>
                  </div>
                  <div>
                    <p className="num text-sm font-medium text-foreground">{numero(calibracao.offsetMv, 1)} mV</p>
                    <p className="label-micro">offset</p>
                  </div>
                </div>
                <div className="mt-2.5">
                  <Pilula tom={calibracao.status === 'valida' ? 'sucesso' : 'erro'} className="px-1.5 py-0 text-[0.62rem]">
                    {calibracao.status}
                  </Pilula>
                </div>
              </div>
            )}

            <Button onClick={importar} disabled={prontas.length === 0} className="w-full gap-2">
              <Upload className="h-4 w-4" />
              Importar {prontas.length > 0 ? `${prontas.length} resultados` : ''}
            </Button>
          </div>
        </Secao>

        <Secao titulo="Como a conciliação funciona">
          <ul className="space-y-2.5 text-xs leading-relaxed text-muted-foreground">
            <li>A identificação da linha é comparada ao <strong>protocolo</strong> da amostra, ignorando pontuação.</li>
            <li>Não casando, tenta a <strong>identificação de campo</strong> informada pelo cliente.</li>
            <li>Só entram ensaios de pH ainda <strong>pendentes</strong>; resultados já lidos nunca são sobrescritos.</li>
            <li>Toda linha importada fica marcada com origem <strong>importação</strong> na trilha de auditoria.</li>
          </ul>
        </Secao>
      </div>
    </div>
  );
}
