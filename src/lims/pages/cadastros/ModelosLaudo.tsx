/* ============================================================
   BANCADA — modelo do laudo

   O laudo é o que o cliente guarda, mostra ao agrônomo e leva ao
   banco para financiar a safra. Cada laboratório quer o seu: o
   timbre, a ordem dos ensaios, o que entra e o que não entra.
   ============================================================ */

import { useMemo } from 'react';
import { ArrowDown, ArrowUp, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { useAcoes, useBancada } from '../../data/store';
import { PainelRegistro, novoId } from '../../components/editor';
import { Pilula } from '../../components/primitivos';
import type { ModeloLaudo } from '../../types';

const QUALQUER = 'qualquer';

export function ModelosLaudo() {
  const { estado } = useBancada();
  const { salvarCadastro } = useAcoes();

  const nomeDaUnidade = (id?: string) =>
    estado.unidades.find((u) => u.id === id)?.sigla ?? 'todas';
  const nomeDoGrupo = (id?: string) =>
    estado.grupos.find((g) => g.id === id)?.nome ?? 'qualquer';

  return (
    <PainelRegistro
      titulo="Modelo do laudo"
      descricao="Timbre, ordem dos ensaios, observações e assinatura — o laudo com a cara do laboratório."
      itens={estado.modelosLaudo}
      larguraDialogo="sm:max-w-3xl"
      colunas={[
        {
          chave: 'nome', titulo: 'Modelo', valor: (m: ModeloLaudo) => m.nome,
          render: (m) => <span className="text-xs font-medium">{m.nome}</span>,
        },
        {
          chave: 'unidade', titulo: 'Unidade', secundaria: true,
          render: (m) => <span className="text-xs text-muted-foreground">{nomeDaUnidade(m.unidadeId)}</span>,
        },
        {
          chave: 'grupo', titulo: 'Análise', secundaria: true,
          render: (m) => <span className="text-xs text-muted-foreground">{nomeDoGrupo(m.grupoId)}</span>,
        },
        {
          chave: 'ordem', titulo: 'Ensaios na ordem', alinhamento: 'direita', secundaria: true,
          render: (m) => (
            <span className="num text-xs text-muted-foreground">
              {m.ordemParametros.length || '—'}
            </span>
          ),
        },
        {
          chave: 'ativo', titulo: '', alinhamento: 'direita',
          render: (m) => !m.ativo && (
            <Pilula tom="neutro" className="px-1.5 py-0 text-[0.62rem]">inativo</Pilula>
          ),
        },
      ]}
      campos={[
        { tipo: 'texto', chave: 'nome', rotulo: 'Nome do modelo', largura: 2 },
        {
          tipo: 'selecao', chave: 'unidadeId', rotulo: 'Unidade',
          opcoes: [
            { valor: QUALQUER, rotulo: 'Todas as unidades' },
            ...estado.unidades.map((u) => ({ valor: u.id, rotulo: `${u.sigla} — ${u.nome}` })),
          ],
        },
        {
          tipo: 'selecao', chave: 'grupoId', rotulo: 'Análise',
          opcoes: [
            { valor: QUALQUER, rotulo: 'Qualquer análise' },
            ...estado.grupos.map((g) => ({ valor: g.id, rotulo: g.nome })),
          ],
        },
        {
          tipo: 'texto', chave: 'logoUrl', rotulo: 'Endereço do logotipo', largura: 2,
          dica: 'Deixe vazio para usar só o nome da unidade no timbre.',
        },
        { tipo: 'area', chave: 'cabecalho', rotulo: 'Linhas extras do cabeçalho' },
        { tipo: 'area', chave: 'rodape', rotulo: 'Texto do rodapé' },
        { tipo: 'texto', chave: 'cargoAssinatura', rotulo: 'Cargo sob a assinatura' },
        {
          tipo: 'selecao', chave: 'disposicaoPadrao', rotulo: 'Como abrir o laudo',
          opcoes: [
            { valor: 'amostra', rotulo: 'Uma tabela por amostra' },
            { valor: 'matriz', rotulo: 'Matriz do lote' },
          ],
        },
        {
          tipo: 'booleano', chave: 'mostrarInterpretacao', rotulo: 'Mostrar interpretação',
          dica: 'A faixa (baixo/médio/alto) da tabela de referência adotada.',
        },
        {
          tipo: 'booleano', chave: 'mostrarIncerteza', rotulo: 'Mostrar incerteza',
        },
        {
          tipo: 'booleano', chave: 'mostrarMetodos', rotulo: 'Mostrar métodos empregados',
        },
        { tipo: 'booleano', chave: 'ativo', rotulo: 'Ativo' },
      ]}
      extraFormulario={(rascunho, aoMudar) => (
        <div className="space-y-5">
          <OrdemDosEnsaios modelo={rascunho} aoMudar={aoMudar} />
          <Observacoes modelo={rascunho} aoMudar={aoMudar} />
        </div>
      )}
      validar={(m) => (!m.nome.trim() ? 'Dê um nome ao modelo.' : undefined)}
      criar={() => ({
        id: novoId('mdl'), nome: '',
        unidadeId: QUALQUER, grupoId: QUALQUER as ModeloLaudo['grupoId'],
        ordemParametros: [], agrupamento: 'nenhum' as const, observacaoIds: [],
        mostrarIncerteza: true, mostrarInterpretacao: true, mostrarMetodos: true,
        cargoAssinatura: 'Responsável técnico', disposicaoPadrao: 'amostra' as const, ativo: true,
      })}
      aoSalvar={(m) => salvarCadastro('modelosLaudo', {
        ...m,
        unidadeId: m.unidadeId === QUALQUER ? undefined : m.unidadeId,
        grupoId: (m.grupoId as string) === QUALQUER ? undefined : m.grupoId,
      }, m.nome)}
      ativoDe={(m) => m.ativo}
      alternarAtivo={(m) => ({ ...m, ativo: !m.ativo })}
      rotuloDe={(m) => m.nome}
      camposBusca={(m) => [m.nome, nomeDoGrupo(m.grupoId)]}
    />
  );
}

/* ---------------- Ordem dos ensaios ---------------- */

function OrdemDosEnsaios({
  modelo, aoMudar,
}: { modelo: ModeloLaudo; aoMudar: (m: ModeloLaudo) => void }) {
  const { estado } = useBancada();

  const grupo = (modelo.grupoId as string) === QUALQUER ? undefined : modelo.grupoId;
  const candidatos = useMemo(
    () => estado.parametros.filter((p) => p.ativo && (!grupo || p.grupoId === grupo)),
    [estado.parametros, grupo],
  );
  const porId = useMemo(() => new Map(candidatos.map((p) => [p.id, p])), [candidatos]);

  const escolhidos = modelo.ordemParametros.filter((id) => porId.has(id));
  const restantes = candidatos.filter((p) => !escolhidos.includes(p.id));

  const trocar = (de: number, para: number) => {
    if (para < 0 || para >= escolhidos.length) return;
    const lista = [...escolhidos];
    [lista[de], lista[para]] = [lista[para], lista[de]];
    aoMudar({ ...modelo, ordemParametros: lista });
  };

  return (
    <div>
      <Label className="label-micro mb-2 block">Ordem dos ensaios no laudo</Label>

      {escolhidos.length === 0 ? (
        <p className="mb-2 text-[0.7rem] text-muted-foreground">
          Sem ordem definida, o laudo segue a ordem do cadastro de elementos.
        </p>
      ) : (
        <ul className="mb-2 space-y-1">
          {escolhidos.map((id, i) => (
            <li key={id} className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[hsl(var(--line-soft))] px-2.5 py-1.5">
              <span className="num w-5 shrink-0 text-[0.66rem] text-muted-foreground">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-xs">
                <span className="num mr-1.5 text-[0.66rem] text-muted-foreground">{porId.get(id)!.codigo}</span>
                {porId.get(id)!.nome}
              </span>
              <Button
                variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                aria-label="Subir" disabled={i === 0} onClick={() => trocar(i, i - 1)}
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                aria-label="Descer" disabled={i === escolhidos.length - 1} onClick={() => trocar(i, i + 1)}
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                aria-label="Tirar da ordem"
                onClick={() => aoMudar({ ...modelo, ordemParametros: escolhidos.filter((x) => x !== id) })}
              >
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {restantes.length > 0 && (
        <Select
          value=""
          onValueChange={(id) => aoMudar({ ...modelo, ordemParametros: [...escolhidos, id] })}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Acrescentar ensaio à ordem…" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {restantes.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="num mr-2 text-[0.65rem] text-muted-foreground">{p.codigo}</span>
                {p.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <p className="mt-1.5 text-[0.66rem] text-muted-foreground">
        O que ficar de fora sai depois, na ordem do cadastro — elemento novo não some do laudo.
      </p>
    </div>
  );
}

/* ---------------- Observações do laudo ---------------- */

function Observacoes({
  modelo, aoMudar,
}: { modelo: ModeloLaudo; aoMudar: (m: ModeloLaudo) => void }) {
  const { estado } = useBancada();
  const ativas = estado.observacoesFixas.filter((o) => o.ativo);

  const alternar = (id: string) => {
    const atual = modelo.observacaoIds;
    aoMudar({
      ...modelo,
      observacaoIds: atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    });
  };

  return (
    <div>
      <Label className="label-micro mb-2 block">Observações que entram no laudo</Label>
      <ul className="space-y-1.5">
        {ativas.map((o) => (
          <li key={o.id}>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-sm)] border border-[hsl(var(--line-soft))] px-2.5 py-2">
              <Checkbox
                checked={modelo.observacaoIds.includes(o.id)}
                onCheckedChange={() => alternar(o.id)}
                className="mt-0.5"
              />
              <span className="min-w-0 text-[0.7rem] leading-relaxed text-muted-foreground">
                {o.nome}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {modelo.observacaoIds.length === 0 && (
        <p className="mt-1.5 text-[0.66rem] text-muted-foreground">
          Sem escolha, o laudo traz as três primeiras observações ativas do cadastro.
        </p>
      )}
    </div>
  );
}
