/* ============================================================
   BANCADA — lista de trabalho de ensaios
   Visão transversal às amostras, para revisar e aprovar em lote.
   ============================================================ */

import { useMemo, useState } from 'react';
import { CheckCheck, FlaskConical, Lock, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useAcoes, useBancada, useIndices } from '../data/store';
import { podeAprovarEnsaio } from '../lib/rbac';
import { numero, tempoRelativo } from '../lib/format';
import {
  BarraFiltros, CabecalhoPagina, Indicador, Pilula, Secao, Segmentos, Tabela, Vazio, filtrar,
} from '../components/primitivos';
import { ChipPh } from '../components/ph-visual';
import type { TomStatus } from '../components/primitivos';
import type { Ensaio, StatusEnsaio } from '../types';

const TOM: Record<StatusEnsaio, TomStatus> = {
  pendente: 'neutro',
  'em-bancada': 'info',
  lido: 'alerta',
  revisado: 'info',
  aprovado: 'sucesso',
  repetir: 'erro',
};

type Filtro = 'todos' | StatusEnsaio;

export default function Ensaios() {
  const { estado, usuario, papel, pode } = useBancada();
  const { aprovarEnsaio, repetirEnsaio } = useAcoes();
  const { amostraPorId, parametroPorId, usuarioPorId, clientePorId } = useIndices();

  const [filtro, setFiltro] = useState<Filtro>('lido');
  const [busca, setBusca] = useState('');
  const [parametroFiltro, setParametroFiltro] = useState('todos');
  const [marcados, setMarcados] = useState<string[]>([]);

  const contagens = useMemo(() => {
    const c: Record<string, number> = { todos: estado.ensaios.length };
    for (const e of estado.ensaios) c[e.status] = (c[e.status] ?? 0) + 1;
    return c;
  }, [estado.ensaios]);

  const listados = useMemo(() => {
    let base = estado.ensaios;
    if (filtro !== 'todos') base = base.filter((e) => e.status === filtro);
    if (parametroFiltro !== 'todos') base = base.filter((e) => e.parametroId === parametroFiltro);
    return filtrar(base, busca, (e) => [
      amostraPorId.get(e.amostraId)?.protocolo,
      amostraPorId.get(e.amostraId)?.identificacaoCampo,
      parametroPorId.get(e.parametroId)?.nome,
    ]).slice(0, 150);
  }, [estado.ensaios, filtro, parametroFiltro, busca, amostraPorId, parametroPorId]);

  const aprovaveis = useMemo(
    () => listados.filter((e) =>
      (e.status === 'lido' || e.status === 'revisado') &&
      podeAprovarEnsaio(papel, usuario, e.analistaId).permitido),
    [listados, papel, usuario],
  );

  const bloqueados = useMemo(
    () => listados.filter((e) =>
      (e.status === 'lido' || e.status === 'revisado') && e.analistaId === usuario.id),
    [listados, usuario.id],
  );

  const aprovarMarcados = () => {
    const validos = marcados.filter((id) => aprovaveis.some((e) => e.id === id));
    if (validos.length === 0) {
      toast.error('Nenhum ensaio elegível selecionado.');
      return;
    }
    validos.forEach((id) => aprovarEnsaio(id));
    setMarcados([]);
    toast.success(`${validos.length} resultados aprovados.`);
  };

  const parametrosEmUso = useMemo(() => {
    const ids = new Set(estado.ensaios.map((e) => e.parametroId));
    return estado.parametros.filter((p) => ids.has(p.id));
  }, [estado.ensaios, estado.parametros]);

  return (
    <>
      <CabecalhoPagina
        eyebrow="Produção"
        titulo="Ensaios"
        descricao="Revisão técnica e liberação de resultados. A segregação de funções exigida pela ISO/IEC 17025 é aplicada aqui: ninguém aprova o próprio resultado."
        acoes={
          <Select value={parametroFiltro} onValueChange={setParametroFiltro}>
            <SelectTrigger className="h-9 w-56 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value="todos">Todos os parâmetros</SelectItem>
              {parametrosEmUso.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      >
        <div className="mt-6">
          <Segmentos
            valor={filtro}
            aoMudar={(v) => { setFiltro(v); setMarcados([]); }}
            opcoes={[
              { valor: 'todos', rotulo: 'Todos', contagem: contagens.todos },
              { valor: 'pendente', rotulo: 'Pendentes', contagem: contagens.pendente ?? 0 },
              { valor: 'em-bancada', rotulo: 'Em bancada', contagem: contagens['em-bancada'] ?? 0 },
              { valor: 'lido', rotulo: 'Lidos', contagem: contagens.lido ?? 0 },
              { valor: 'revisado', rotulo: 'Revisados', contagem: contagens.revisado ?? 0 },
              { valor: 'aprovado', rotulo: 'Aprovados', contagem: contagens.aprovado ?? 0 },
              { valor: 'repetir', rotulo: 'Repetir', contagem: contagens.repetir ?? 0 },
            ]}
          />
        </div>
      </CabecalhoPagina>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador rotulo="Aguardando revisão" valor={contagens.lido ?? 0} detalhe="resultados lidos na bancada" />
        <Indicador rotulo="Aprovados" valor={contagens.aprovado ?? 0} detalhe={`${numero(((contagens.aprovado ?? 0) / estado.ensaios.length) * 100, 0)}% do total`} />
        <Indicador rotulo="Em repetição" valor={contagens.repetir ?? 0} detalhe="devolvidos pela revisão" destaque={(contagens.repetir ?? 0) > 0} />
        <Indicador
          rotulo="Bloqueados para você"
          valor={bloqueados.length}
          detalhe="lidos por você — exigem outro revisor"
          icone={Lock}
        />
      </div>

      {pode('analises:aprovar') && marcados.length > 0 && (
        <div className="animate-rise mb-4 flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-primary/30 bg-primary/8 px-5 py-3.5">
          <p className="num flex-1 text-sm text-foreground">
            {marcados.length} {marcados.length === 1 ? 'ensaio selecionado' : 'ensaios selecionados'}
          </p>
          <Button variant="ghost" size="sm" onClick={() => setMarcados([])} className="text-xs">limpar</Button>
          <Button size="sm" onClick={aprovarMarcados} className="gap-1.5 text-xs">
            <CheckCheck className="h-3.5 w-3.5" /> Aprovar selecionados
          </Button>
        </div>
      )}

      <Secao semPadding>
        <div className="px-5 pt-5">
          <BarraFiltros busca={busca} aoBuscar={setBusca} placeholder="Buscar por protocolo, identificação ou parâmetro…" />
        </div>
        <Tabela
          denso
          colunas={[
            ...(pode('analises:aprovar') ? [{
              chave: 'sel', titulo: '', largura: '2.5rem',
              render: (e: Ensaio) => {
                const elegivel = aprovaveis.some((x) => x.id === e.id);
                const proprio = e.analistaId === usuario.id && (e.status === 'lido' || e.status === 'revisado');
                return proprio ? (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground/50" aria-label="Você leu este ensaio" />
                ) : (
                  <Checkbox
                    disabled={!elegivel}
                    checked={marcados.includes(e.id)}
                    onCheckedChange={(v) => setMarcados((m) => (v ? [...m, e.id] : m.filter((x) => x !== e.id)))}
                    aria-label="Selecionar ensaio"
                  />
                );
              },
            }] : []),
            {
              chave: 'protocolo', titulo: 'Protocolo',
              valor: (e) => amostraPorId.get(e.amostraId)?.protocolo ?? '',
              render: (e) => <span className="num text-xs font-medium">{amostraPorId.get(e.amostraId)?.protocolo}</span>,
            },
            {
              chave: 'cliente', titulo: 'Cliente', secundaria: true,
              render: (e) => {
                const a = amostraPorId.get(e.amostraId);
                return <span className="truncate text-xs text-muted-foreground">{a && clientePorId.get(a.clienteId)?.nomeFantasia}</span>;
              },
            },
            {
              chave: 'parametro', titulo: 'Determinação',
              valor: (e) => parametroPorId.get(e.parametroId)?.nome ?? '',
              render: (e) => {
                const p = parametroPorId.get(e.parametroId);
                return (
                  <span className="flex items-center gap-2">
                    <span className="truncate text-xs">{p?.nome}</span>
                    {p?.ehPh && <Pilula tom="primario" className="shrink-0 px-1.5 py-0 text-[0.56rem]">pH</Pilula>}
                  </span>
                );
              },
            },
            {
              chave: 'resultado', titulo: 'Resultado', alinhamento: 'direita', valor: (e) => e.valor ?? -1,
              render: (e) => {
                const p = parametroPorId.get(e.parametroId);
                if (e.valor === undefined) return <span className="num text-xs text-muted-foreground">—</span>;
                return p?.ehPh
                  ? <ChipPh valor={e.valor} extrator={p.extrator ?? 'H2O'} tamanho="sm" />
                  : <span className="num text-xs">{numero(e.valor, p?.casasDecimais ?? 2)} <span className="text-muted-foreground">{p?.unidade}</span></span>;
              },
            },
            {
              chave: 'analista', titulo: 'Analista', secundaria: true,
              render: (e) => <span className="text-xs text-muted-foreground">{e.analistaId ? usuarioPorId.get(e.analistaId)?.nome.split(' ')[0] : '—'}</span>,
            },
            {
              chave: 'quando', titulo: 'Leitura', alinhamento: 'direita', secundaria: true, valor: (e) => e.dataLeitura ?? '',
              render: (e) => <span className="text-xs text-muted-foreground">{e.dataLeitura ? tempoRelativo(e.dataLeitura) : '—'}</span>,
            },
            {
              chave: 'status', titulo: 'Status', alinhamento: 'direita', valor: (e) => e.status,
              render: (e) => <Pilula tom={TOM[e.status]} className="px-1.5 py-0 text-[0.62rem]">{e.status}</Pilula>,
            },
            ...(pode('analises:aprovar') ? [{
              chave: 'acoes', titulo: '', alinhamento: 'direita' as const,
              render: (e: Ensaio) => {
                if (e.status !== 'lido' && e.status !== 'revisado') return null;
                const v = podeAprovarEnsaio(papel, usuario, e.analistaId);
                return (
                  <span className="flex justify-end gap-1">
                    <Button
                      size="sm" variant="ghost" className="h-6 w-6 p-0"
                      disabled={!v.permitido}
                      title={v.motivo ?? 'Aprovar'}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        if (!v.permitido) { toast.error('Aprovação bloqueada', { description: v.motivo }); return; }
                        aprovarEnsaio(e.id);
                        toast.success('Resultado aprovado.');
                      }}
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="h-6 w-6 p-0" title="Devolver para repetição"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        repetirEnsaio(e.id, 'Repetição solicitada na revisão técnica');
                        toast.info('Ensaio devolvido à bancada.');
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </span>
                );
              },
            }] : []),
          ]}
          dados={listados}
          chaveDe={(e) => e.id}
          vazio={<Vazio icone={FlaskConical} titulo="Nenhum ensaio nesta visão" descricao="Troque o filtro de status ou o parâmetro." />}
        />
      </Secao>
    </>
  );
}
