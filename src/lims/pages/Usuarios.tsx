/* ============================================================
   BANCADA — usuários, papéis e matriz de permissões
   ============================================================ */

import { useMemo, useState } from 'react';
import { KeyRound, Lock, ShieldCheck, UserCog, Users } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useAcoes, useBancada, useIndices } from '../data/store';
import { ROTULO_ACAO, ROTULO_MODULO } from '../lib/rbac';
import { ACOES, MODULOS } from '../types';
import { dataHora, tempoRelativo } from '../lib/format';
import {
  BarraFiltros, CabecalhoPagina, Indicador, Pilula, Secao, Segmentos, Tabela, Vazio, filtrar,
} from '../components/primitivos';
import type { Acao, Modulo, Permissao, Usuario } from '../types';

type Aba = 'usuarios' | 'papeis';

export default function Usuarios() {
  const { estado, usuario: eu, pode } = useBancada();
  const { salvarUsuario, salvarPapel } = useAcoes();
  const { usuarioPorId } = useIndices();

  const [aba, setAba] = useState<Aba>('usuarios');
  const [busca, setBusca] = useState('');
  const [papelSelecionado, setPapelSelecionado] = useState(estado.papeis[1]?.id ?? estado.papeis[0].id);

  const papelPorId = useMemo(() => new Map(estado.papeis.map((p) => [p.id, p])), [estado.papeis]);
  const papel = papelPorId.get(papelSelecionado);

  const kpis = useMemo(() => ({
    ativos: estado.usuarios.filter((u) => u.ativo).length,
    comMfa: estado.usuarios.filter((u) => u.mfa).length,
    papeis: estado.papeis.length,
    aprovadores: estado.usuarios.filter((u) => papelPorId.get(u.papelId)?.permissoes.includes('analises:aprovar')).length,
  }), [estado.usuarios, estado.papeis, papelPorId]);

  const podeEditar = pode('usuarios:editar');

  const alternarPermissao = (modulo: Modulo, acao: Acao) => {
    if (!papel || !podeEditar) return;
    if (papel.sistema && papel.id === 'papel-admin') {
      toast.error('O papel de Administrador não pode ser alterado.');
      return;
    }
    const chave = `${modulo}:${acao}` as Permissao;
    const tem = papel.permissoes.includes(chave);
    // "ver" é pré-requisito: desmarcá-lo remove as demais ações do módulo
    let permissoes = tem
      ? papel.permissoes.filter((p) => p !== chave)
      : [...papel.permissoes, chave];
    if (acao === 'ver' && tem) {
      permissoes = permissoes.filter((p) => !p.startsWith(`${modulo}:`));
    }
    if (acao !== 'ver' && !tem && !permissoes.includes(`${modulo}:ver`)) {
      permissoes.push(`${modulo}:ver` as Permissao);
    }
    salvarPapel({ ...papel, permissoes });
  };

  return (
    <>
      <CabecalhoPagina
        eyebrow="Administração"
        titulo="Usuários e papéis"
        descricao="Controle de acesso por módulo e ação. A mesma matriz é espelhada nas políticas de linha do banco, de modo que a interface nunca é a única barreira."
      >
        <div className="mt-6">
          <Segmentos
            valor={aba}
            aoMudar={setAba}
            opcoes={[
              { valor: 'usuarios', rotulo: 'Usuários', contagem: estado.usuarios.length },
              { valor: 'papeis', rotulo: 'Papéis e permissões', contagem: estado.papeis.length },
            ]}
          />
        </div>
      </CabecalhoPagina>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador rotulo="Usuários ativos" valor={kpis.ativos} detalhe={`${estado.usuarios.length} cadastrados`} icone={Users} />
        <Indicador rotulo="Com segundo fator" valor={kpis.comMfa} detalhe={`${estado.usuarios.length - kpis.comMfa} sem MFA`} icone={KeyRound} destaque={kpis.comMfa < estado.usuarios.length} />
        <Indicador rotulo="Papéis definidos" valor={kpis.papeis} icone={ShieldCheck} />
        <Indicador rotulo="Podem aprovar resultados" valor={kpis.aprovadores} detalhe="responsáveis técnicos" />
      </div>

      {aba === 'usuarios' && (
        <Secao semPadding>
          <div className="px-5 pt-5">
            <BarraFiltros busca={busca} aoBuscar={setBusca} placeholder="Buscar por nome, e-mail ou cargo…" />
          </div>
          <Tabela
            colunas={[
              {
                chave: 'nome', titulo: 'Usuário', valor: (u) => u.nome,
                render: (u) => {
                  const p = papelPorId.get(u.papelId);
                  return (
                    <span className="flex items-center gap-2.5">
                      <span
                        className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-semibold"
                        style={{ background: `hsl(${p?.cor} / 0.18)`, color: `hsl(${p?.cor})` }}
                      >
                        {u.iniciais}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium text-foreground">
                          {u.nome}
                          {u.id === eu.id && <span className="ml-1.5 text-[0.62rem] text-muted-foreground">(você)</span>}
                        </span>
                        <span className="block truncate text-[0.66rem] text-muted-foreground">{u.email}</span>
                      </span>
                    </span>
                  );
                },
              },
              { chave: 'cargo', titulo: 'Cargo', secundaria: true, render: (u) => <span className="truncate text-xs text-muted-foreground">{u.cargo}</span> },
              {
                chave: 'papel', titulo: 'Papel', valor: (u) => papelPorId.get(u.papelId)?.nome ?? '',
                render: (u) => {
                  const p = papelPorId.get(u.papelId);
                  if (!podeEditar) {
                    return (
                      <Pilula tom="neutro" className="px-1.5 py-0 text-[0.62rem]" >
                        <span style={{ color: `hsl(${p?.cor})` }}>{p?.nome}</span>
                      </Pilula>
                    );
                  }
                  return (
                    <Select
                      value={u.papelId}
                      onValueChange={(v) => {
                        salvarUsuario({ ...u, papelId: v });
                        toast.success('Papel atualizado', { description: `${u.nome} agora é ${papelPorId.get(v)?.nome}.` });
                      }}
                    >
                      <SelectTrigger className="h-7 w-44 text-xs" onClick={(e) => e.stopPropagation()}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {estado.papeis.map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  );
                },
              },
              {
                chave: 'habilitacoes', titulo: 'Habilitações', secundaria: true,
                render: (u) => (
                  <span className="num text-xs text-muted-foreground">
                    {u.habilitacoes.length > 0 ? `${u.habilitacoes.length} grupos` : '—'}
                  </span>
                ),
              },
              {
                chave: 'mfa', titulo: 'MFA', alinhamento: 'centro',
                render: (u) => (
                  <Switch
                    checked={u.mfa}
                    disabled={!podeEditar}
                    onCheckedChange={(v) => {
                      salvarUsuario({ ...u, mfa: v });
                      toast.success(v ? 'Segundo fator exigido.' : 'Segundo fator desativado.');
                    }}
                    aria-label={`Segundo fator de ${u.nome}`}
                  />
                ),
              },
              {
                chave: 'acesso', titulo: 'Último acesso', alinhamento: 'direita', secundaria: true, valor: (u) => u.ultimoAcesso ?? '',
                render: (u) => <span className="text-xs text-muted-foreground">{u.ultimoAcesso ? tempoRelativo(u.ultimoAcesso) : 'nunca'}</span>,
              },
              {
                chave: 'ativo', titulo: 'Situação', alinhamento: 'direita',
                render: (u) => (
                  <Pilula tom={u.ativo ? 'sucesso' : 'neutro'} className="px-1.5 py-0 text-[0.62rem]">
                    {u.ativo ? 'ativo' : 'inativo'}
                  </Pilula>
                ),
              },
            ]}
            dados={filtrar(estado.usuarios, busca, (u) => [u.nome, u.email, u.cargo])}
            chaveDe={(u) => u.id}
            ordenacaoInicial={{ chave: 'nome', direcao: 'asc' }}
            vazio={<Vazio icone={Users} titulo="Nenhum usuário encontrado" />}
          />
        </Secao>
      )}

      {aba === 'papeis' && (
        <div className="grid gap-5 xl:grid-cols-[17rem_minmax(0,1fr)]">
          <Secao titulo="Papéis" semPadding>
            <ul className="divide-y divide-[hsl(var(--line-soft))]">
              {estado.papeis.map((p) => {
                const ativo = p.id === papelSelecionado;
                const quantos = estado.usuarios.filter((u) => u.papelId === p.id).length;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setPapelSelecionado(p.id)}
                      className={cn(
                        'relative w-full px-4 py-3.5 text-left transition-colors',
                        ativo ? 'bg-[hsl(var(--surface-raised))]' : 'hover:bg-[hsl(var(--surface-raised)/0.6)]',
                      )}
                    >
                      {ativo && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full" style={{ background: `hsl(${p.cor})` }} aria-hidden />}
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: `hsl(${p.cor})` }} aria-hidden />
                        <span className="truncate text-xs font-medium text-foreground">{p.nome}</span>
                        {p.sistema && <Lock className="ml-auto h-3 w-3 shrink-0 text-muted-foreground/60" />}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[0.66rem] leading-snug text-muted-foreground">{p.descricao}</p>
                      <p className="num mt-1.5 text-[0.62rem] text-muted-foreground/70">
                        {quantos} {quantos === 1 ? 'usuário' : 'usuários'} · {p.permissoes.length} permissões
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Secao>

          <Secao
            titulo={papel ? `Matriz de ${papel.nome}` : 'Matriz'}
            descricao={podeEditar ? 'Marcar uma ação concede automaticamente a visualização do módulo.' : 'Somente leitura — seu papel não permite editar permissões.'}
            semPadding
          >
            {papel && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--line-soft))]">
                      <th className="label-micro px-5 py-3 text-left">Módulo</th>
                      {ACOES.map((a) => (
                        <th key={a} className="label-micro px-3 py-3 text-center">{ROTULO_ACAO[a]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MODULOS.map((m) => {
                      const temVer = papel.permissoes.includes(`${m}:ver`);
                      return (
                        <tr key={m} className="border-b border-[hsl(var(--line-soft))] last:border-0">
                          <td className="px-5 py-2.5">
                            <span className={cn('text-xs', temVer ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                              {ROTULO_MODULO[m]}
                            </span>
                          </td>
                          {ACOES.map((a) => {
                            const chave = `${m}:${a}` as Permissao;
                            const marcado = papel.permissoes.includes(chave);
                            return (
                              <td key={a} className="px-3 py-2.5 text-center">
                                <Checkbox
                                  checked={marcado}
                                  disabled={!podeEditar || papel.id === 'papel-admin'}
                                  onCheckedChange={() => alternarPermissao(m, a)}
                                  aria-label={`${ROTULO_ACAO[a]} em ${ROTULO_MODULO[m]}`}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="border-t border-[hsl(var(--line-soft))] p-5">
              <div className="flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-[hsl(var(--line-soft))] bg-[hsl(var(--surface-sunken))] px-3.5 py-3">
                <UserCog className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
                  Além da matriz, uma regra fixa sempre se aplica: <strong>ninguém aprova um ensaio que
                  leu</strong>. A segregação de funções da ISO/IEC 17025 é verificada no momento da
                  aprovação e não pode ser desligada por permissão.
                </p>
              </div>
              {papel?.sistema && (
                <p className="mt-3 flex items-center gap-1.5 text-[0.68rem] text-muted-foreground">
                  <Lock className="h-3 w-3" /> Papel de sistema — não pode ser excluído.
                </p>
              )}
              {podeEditar && papel && papel.id !== 'papel-admin' && (
                <Button
                  variant="outline" size="sm" className="mt-4 text-xs"
                  onClick={() => {
                    salvarPapel({ ...papel, permissoes: MODULOS.map((m) => `${m}:ver` as Permissao) });
                    toast.info('Permissões reduzidas à leitura.');
                  }}
                >
                  Reduzir a somente leitura
                </Button>
              )}
            </div>
          </Secao>
        </div>
      )}
    </>
  );
}
