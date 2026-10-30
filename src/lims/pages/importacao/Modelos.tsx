/* ============================================================
   BANCADA — modelos de importação

   Sem isto o analista refaz o mesmo mapeamento de colunas toda vez
   que traz a planilha do aparelho — todo dia, para o mesmo arquivo,
   do mesmo equipamento. O modelo guarda o acerto uma vez e diz, na
   próxima, o que mudou no arquivo.
   ============================================================ */

import { useMemo, useState } from 'react';
import { BookmarkPlus, Check, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { useAcoes, useBancada } from '../../data/store';
import { aplicarModelo, modeloDoMapeamento, modelosDoEquipamento } from '../../lib/importacao';
import type { ColunaLida } from '../../lib/importacao';
import { Pilula } from '../../components/primitivos';
import { data as fData } from '../../lib/format';
import type { ModeloImportacao } from '../../types';

const NENHUM = 'nenhum';

export function BarraModelos({
  fluxo, colunas, temCabecalho, mapeamento, aoAplicar, rotuloDoCampo,
}: {
  fluxo: ModeloImportacao['fluxo'];
  colunas: ColunaLida[];
  temCabecalho: boolean;
  mapeamento: Record<number, string>;
  aoAplicar: (mapa: Record<number, string>) => void;
  /** traduz o destino salvo para algo legível no aviso de ausente */
  rotuloDoCampo: (campo: string) => string;
}) {
  const { estado, pode } = useBancada();
  const { salvarModeloImportacao } = useAcoes();

  const [equipamentoId, setEquipamentoId] = useState(NENHUM);
  const [modeloId, setModeloId] = useState(NENHUM);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ ausentes: string[]; novas: string[] } | null>(null);

  const equipamento = estado.equipamentos.find((e) => e.id === equipamentoId);

  const disponiveis = useMemo(
    () => modelosDoEquipamento(estado.modelosImportacao, equipamento?.id, equipamento?.tipo, fluxo),
    [estado.modelosImportacao, equipamento, fluxo],
  );

  const aplicar = (id: string) => {
    setModeloId(id);
    if (id === NENHUM) { setAviso(null); return; }
    const modelo = estado.modelosImportacao.find((m) => m.id === id);
    if (!modelo) return;

    const r = aplicarModelo(modelo, colunas);
    aoAplicar(r.mapa);

    /* O que o modelo esperava e não veio não pode passar calado: um
       aparelho que deixou de exportar uma coluna faria a importação
       gravar a vizinha no lugar. */
    setAviso(r.ausentes.length > 0 || r.naoReconhecidas.length > 0
      ? { ausentes: r.ausentes.map(rotuloDoCampo), novas: r.naoReconhecidas }
      : null);

    toast.success(`Modelo "${modelo.nome}" aplicado`, {
      description: `${Object.keys(r.mapa).length} coluna(s) reconhecida(s).`,
    });
  };

  const colunasMapeadas = Object.values(mapeamento).filter((v) => v && v !== 'ignorar').length;

  return (
    <>
      <div className="flex flex-wrap items-end gap-3 border-t border-[hsl(var(--line-soft))] pt-4">
        <div className="min-w-[12rem] flex-1">
          <Label className="label-micro mb-2 block">Equipamento de origem</Label>
          <Select value={equipamentoId} onValueChange={(v) => { setEquipamentoId(v); setModeloId(NENHUM); setAviso(null); }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="qualquer" /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={NENHUM}>Qualquer aparelho</SelectItem>
              {estado.equipamentos.filter((e) => e.ativo).map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  <span className="num mr-2 text-[0.65rem] text-muted-foreground">{e.tag}</span>
                  {e.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[12rem] flex-1">
          <Label className="label-micro mb-2 block">Modelo salvo</Label>
          <Select value={modeloId} onValueChange={aplicar} disabled={disponiveis.length === 0}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder={disponiveis.length === 0 ? 'nenhum para este aparelho' : 'escolher…'} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={NENHUM}>Mapear na mão</SelectItem>
              {disponiveis.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.nome}
                  <span className="num ml-2 text-[0.65rem] text-muted-foreground">{fData(m.data)}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {pode('configuracoes:criar') && (
          <Button
            variant="outline" className="h-9 gap-2"
            disabled={colunasMapeadas === 0}
            onClick={() => setSalvando(true)}
          >
            <BookmarkPlus className="h-4 w-4" /> Salvar como modelo
          </Button>
        )}
      </div>

      {aviso && (
        <div className="mt-3 flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning)/0.1)] px-3.5 py-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />
          <div className="min-w-0 text-[0.7rem] leading-relaxed">
            <p className="font-medium text-[hsl(var(--warning))]">O arquivo não bate com o modelo</p>
            {aviso.ausentes.length > 0 && (
              <p className="mt-0.5 text-muted-foreground">
                O modelo esperava e não achou: <span className="text-foreground">{aviso.ausentes.join(', ')}</span>.
              </p>
            )}
            {aviso.novas.length > 0 && (
              <p className="mt-0.5 text-muted-foreground">
                Colunas novas, sem destino: <span className="text-foreground">{aviso.novas.join(', ')}</span>.
              </p>
            )}
            <p className="mt-1 text-muted-foreground/80">
              Confira o mapeamento abaixo antes de gravar.
            </p>
          </div>
        </div>
      )}

      {modeloId !== NENHUM && !aviso && (
        <p className="mt-3 flex items-center gap-2 text-[0.7rem] text-[hsl(var(--success))]">
          <Check className="h-3.5 w-3.5" />
          Todas as colunas do modelo foram encontradas no arquivo.
        </p>
      )}

      {salvando && (
        <DialogoSalvar
          fluxo={fluxo}
          colunas={colunas}
          temCabecalho={temCabecalho}
          mapeamento={mapeamento}
          equipamentoId={equipamentoId === NENHUM ? undefined : equipamentoId}
          aoFechar={(salvo) => {
            setSalvando(false);
            if (salvo) setModeloId(salvo);
          }}
          salvar={salvarModeloImportacao}
        />
      )}
    </>
  );
}

function DialogoSalvar({
  fluxo, colunas, temCabecalho, mapeamento, equipamentoId, aoFechar, salvar,
}: {
  fluxo: ModeloImportacao['fluxo'];
  colunas: ColunaLida[];
  temCabecalho: boolean;
  mapeamento: Record<number, string>;
  equipamentoId?: string;
  aoFechar: (salvoId?: string) => void;
  salvar: (modelo: ModeloImportacao) => void;
}) {
  const { estado } = useBancada();
  const equipamento = estado.equipamentos.find((e) => e.id === equipamentoId);

  const [nome, setNome] = useState(
    equipamento ? `${equipamento.fabricante} ${equipamento.modelo}` : '',
  );
  const [alcance, setAlcance] = useState<'equipamento' | 'tipo' | 'geral'>(
    equipamento ? 'equipamento' : 'geral',
  );

  const confirmar = () => {
    if (!nome.trim()) { toast.error('Dê um nome ao modelo.'); return; }

    const { porTitulo, porIndice } = modeloDoMapeamento(colunas, mapeamento, temCabecalho);
    const modelo: ModeloImportacao = {
      id: `mdi-${Date.now()}`,
      nome: nome.trim(),
      equipamentoId: alcance === 'equipamento' ? equipamentoId : undefined,
      tipoEquipamentoId: alcance === 'tipo' ? equipamento?.tipo : undefined,
      fluxo,
      temCabecalho,
      linhasIgnoradas: 0,
      decimalVirgula: true,
      porTitulo,
      porIndice,
      ativo: true,
      data: new Date().toISOString(),
    };
    salvar(modelo);
    toast.success(`Modelo "${modelo.nome}" salvo.`, {
      description: 'Na próxima importação deste aparelho ele aparece na lista.',
    });
    aoFechar(modelo.id);
  };

  const destinos = Object.values(mapeamento).filter((v) => v && v !== 'ignorar').length;

  return (
    <Dialog open onOpenChange={(a) => { if (!a) aoFechar(); }}>
      <DialogContent className="bancada sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar modelo de importação</DialogTitle>
          <DialogDescription>
            {temCabecalho
              ? 'As colunas ficam guardadas pelo título, então o modelo continua valendo se o aparelho mudar a ordem.'
              : 'O arquivo não tem cabeçalho, então o modelo guarda a posição das colunas — ele deixa de valer se o aparelho mudar a ordem.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="label-micro mb-2 block" htmlFor="mod-nome">Nome</Label>
            <Input
              id="mod-nome" value={nome} onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Genesys 150 — fósforo e potássio" className="h-10"
            />
          </div>

          {equipamento && (
            <div>
              <Label className="label-micro mb-2 block">Vale para</Label>
              <Select value={alcance} onValueChange={(v) => setAlcance(v as typeof alcance)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="equipamento">Só {equipamento.tag}</SelectItem>
                  <SelectItem value="tipo">Toda a família {equipamento.tipo}</SelectItem>
                  <SelectItem value="geral">Qualquer aparelho</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Pilula tom="info" className="text-[0.68rem]">
            {destinos} coluna(s) serão guardadas
          </Pilula>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => aoFechar()}>Cancelar</Button>
          <Button onClick={confirmar}>Salvar modelo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
