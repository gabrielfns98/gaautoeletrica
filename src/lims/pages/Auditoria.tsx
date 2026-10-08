/* ============================================================
   BANCADA — trilha de auditoria
   ============================================================ */

import { useMemo, useState } from 'react';
import { Download, ScrollText } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useBancada, useIndices } from '../data/store';
import { dataHora, tempoRelativo } from '../lib/format';
import {
  BarraFiltros, CabecalhoPagina, Indicador, Pilula, Secao, Tabela, Vazio, filtrar,
} from '../components/primitivos';
import type { RegistroAuditoria } from '../types';

export default function Auditoria() {
  const { estado, pode } = useBancada();
  const { usuarioPorId } = useIndices();
  const [busca, setBusca] = useState('');
  const [entidade, setEntidade] = useState('todas');

  const entidades = useMemo(
    () => [...new Set(estado.auditoria.map((r) => r.entidade))].sort(),
    [estado.auditoria],
  );

  const listados = useMemo(() => {
    const base = entidade === 'todas' ? estado.auditoria : estado.auditoria.filter((r) => r.entidade === entidade);
    return filtrar(base, busca, (r) => [r.acao, r.detalhe, r.entidade, usuarioPorId.get(r.usuarioId)?.nome]);
  }, [estado.auditoria, entidade, busca, usuarioPorId]);

  const hoje = estado.auditoria.filter((r) => new Date(r.data).toDateString() === new Date().toDateString()).length;

  const exportar = () => {
    const linhas = [
      'data;usuario;acao;entidade;entidade_id;detalhe;ip',
      ...listados.map((r) => [
        r.data, usuarioPorId.get(r.usuarioId)?.nome ?? r.usuarioId,
        r.acao, r.entidade, r.entidadeId, r.detalhe.replace(/;/g, ','), r.ip ?? '',
      ].join(';')),
    ].join('\n');

    const url = URL.createObjectURL(new Blob([linhas], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${listados.length} registros exportados.`);
  };

  return (
    <>
      <CabecalhoPagina
        eyebrow="Conformidade"
        titulo="Auditoria"
        descricao="Registro imutável de quem fez o quê e quando. Exigência da ISO/IEC 17025 para rastreabilidade de resultados e alterações."
        acoes={pode('auditoria:exportar') && (
          <Button variant="outline" onClick={exportar} className="gap-2">
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        )}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador rotulo="Eventos registrados" valor={estado.auditoria.length} />
        <Indicador rotulo="Hoje" valor={hoje} destaque={hoje > 0} />
        <Indicador rotulo="Entidades monitoradas" valor={entidades.length} />
        <Indicador rotulo="Usuários com atividade" valor={new Set(estado.auditoria.map((r) => r.usuarioId)).size} />
      </div>

      <Secao semPadding>
        <div className="flex flex-wrap items-center gap-3 px-5 pt-5">
          <div className="min-w-[14rem] flex-1">
            <BarraFiltros busca={busca} aoBuscar={setBusca} placeholder="Buscar por ação, detalhe ou usuário…">
              <Select value={entidade} onValueChange={setEntidade}>
                <SelectTrigger className="h-9 w-44 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as entidades</SelectItem>
                  {entidades.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </BarraFiltros>
          </div>
        </div>
        <Tabela
          denso
          colunas={[
            {
              chave: 'data', titulo: 'Quando', valor: (r) => r.data,
              render: (r) => (
                <span className="block">
                  <span className="num block text-xs text-foreground">{dataHora(r.data)}</span>
                  <span className="block text-[0.64rem] text-muted-foreground">{tempoRelativo(r.data)}</span>
                </span>
              ),
            },
            {
              chave: 'usuario', titulo: 'Usuário', valor: (r) => usuarioPorId.get(r.usuarioId)?.nome ?? '',
              render: (r) => <span className="truncate text-xs">{usuarioPorId.get(r.usuarioId)?.nome ?? r.usuarioId}</span>,
            },
            { chave: 'acao', titulo: 'Ação', valor: (r) => r.acao, render: (r) => <span className="text-xs font-medium text-foreground">{r.acao}</span> },
            {
              chave: 'entidade', titulo: 'Entidade',
              render: (r) => (
                <span className="flex items-center gap-2">
                  <Pilula tom="neutro" className="px-1.5 py-0 text-[0.6rem]">{r.entidade}</Pilula>
                  <span className="num text-[0.64rem] text-muted-foreground">{r.entidadeId}</span>
                </span>
              ),
            },
            { chave: 'detalhe', titulo: 'Detalhe', render: (r) => <span className="truncate text-xs text-muted-foreground">{r.detalhe}</span> },
            { chave: 'ip', titulo: 'Origem', alinhamento: 'direita', secundaria: true, render: (r) => <span className="num text-[0.66rem] text-muted-foreground">{r.ip}</span> },
          ]}
          dados={listados.slice(0, 120)}
          chaveDe={(r) => r.id}
          ordenacaoInicial={{ chave: 'data', direcao: 'desc' }}
          vazio={<Vazio icone={ScrollText} titulo="Nenhum registro encontrado" />}
        />
      </Secao>
    </>
  );
}
