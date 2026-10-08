/* ============================================================
   BANCADA — casca da aplicação
   Barra lateral por módulo (filtrada por permissão), topo com
   unidade ativa, troca de tema e seleção do operador.
   ============================================================ */

import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity, Beaker, Boxes, ClipboardList, FileCheck2, FlaskConical, Gauge,
  LayoutDashboard, Menu, Moon, Receipt, ScrollText, Settings, ShieldCheck,
  Sun, TestTubes, Users, Wallet, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useAcoes, useBancada, useFilaPh } from '../data/store';
import type { Modulo } from '../types';

interface ItemNav {
  modulo: Modulo;
  rotulo: string;
  caminho: string;
  icone: LucideIcon;
  fim?: boolean;
}

const GRUPOS_NAV: Array<{ titulo: string; itens: ItemNav[] }> = [
  {
    titulo: 'Operação',
    itens: [
      { modulo: 'dashboard', rotulo: 'Painel', caminho: '/lab', icone: LayoutDashboard, fim: true },
      { modulo: 'recepcao', rotulo: 'Recepção', caminho: '/lab/recepcao', icone: ClipboardList },
      { modulo: 'amostras', rotulo: 'Amostras', caminho: '/lab/amostras', icone: TestTubes },
      { modulo: 'ph', rotulo: 'Leitura de pH', caminho: '/lab/ph', icone: Gauge },
      { modulo: 'analises', rotulo: 'Ensaios', caminho: '/lab/ensaios', icone: FlaskConical },
      { modulo: 'laudos', rotulo: 'Laudos', caminho: '/lab/laudos', icone: FileCheck2 },
    ],
  },
  {
    titulo: 'Comercial',
    itens: [
      { modulo: 'crm', rotulo: 'CRM', caminho: '/lab/crm', icone: Users },
      { modulo: 'financeiro', rotulo: 'Financeiro', caminho: '/lab/financeiro', icone: Wallet },
      { modulo: 'fiscal', rotulo: 'Fiscal', caminho: '/lab/fiscal', icone: Receipt },
    ],
  },
  {
    titulo: 'Recursos',
    itens: [
      { modulo: 'estoque', rotulo: 'Estoque', caminho: '/lab/estoque', icone: Boxes },
      { modulo: 'equipamentos', rotulo: 'Equipamentos', caminho: '/lab/equipamentos', icone: Beaker },
    ],
  },
  {
    titulo: 'Administração',
    itens: [
      { modulo: 'usuarios', rotulo: 'Usuários e papéis', caminho: '/lab/usuarios', icone: ShieldCheck },
      { modulo: 'auditoria', rotulo: 'Auditoria', caminho: '/lab/auditoria', icone: ScrollText },
      { modulo: 'configuracoes', rotulo: 'Configurações', caminho: '/lab/configuracoes', icone: Settings },
    ],
  },
];

export default function Shell() {
  const { tema } = useBancada();
  const [menuAberto, setMenuAberto] = useState(false);
  const local = useLocation();

  return (
    <div className="bancada min-h-screen bg-background text-foreground" data-theme={tema}>
      <div className="flex min-h-screen">
        {/* --- Barra lateral --- */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-[15.5rem] flex-col border-r border-[hsl(var(--line-soft))]',
            'bg-[hsl(var(--surface-sunken))] transition-transform duration-300 lg:static lg:translate-x-0',
            menuAberto ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <Marca aoFechar={() => setMenuAberto(false)} />
          <ScrollArea className="flex-1">
            <Navegacao aoNavegar={() => setMenuAberto(false)} />
          </ScrollArea>
          <RodapeLateral />
        </aside>

        {menuAberto && (
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMenuAberto(false)}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          />
        )}

        {/* --- Conteúdo --- */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topo aoAbrirMenu={() => setMenuAberto(true)} />
          <main key={local.pathname} className="bench-grid flex-1 px-5 py-7 sm:px-8 sm:py-9">
            <div className="mx-auto w-full max-w-[86rem]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Marca ---------------- */

function Marca({ aoFechar }: { aoFechar: () => void }) {
  return (
    <div className="relative border-b border-[hsl(var(--line-soft))] px-5 pb-4 pt-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-[1.6rem] leading-none tracking-tight text-foreground">
            Bancada
          </p>
          <p className="label-micro mt-1.5">Gestão laboratorial</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={aoFechar}
          className="h-7 w-7 lg:hidden"
          aria-label="Fechar menu"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <span className="ph-spectrum absolute inset-x-0 bottom-0 h-px opacity-60" aria-hidden />
    </div>
  );
}

/* ---------------- Navegação ---------------- */

function Navegacao({ aoNavegar }: { aoNavegar: () => void }) {
  const { podeVerModulo } = useBancada();
  const fila = useFilaPh();

  return (
    <nav className="space-y-6 px-3 py-5">
      {GRUPOS_NAV.map((grupo) => {
        const visiveis = grupo.itens.filter((i) => podeVerModulo(i.modulo));
        if (visiveis.length === 0) return null;

        return (
          <div key={grupo.titulo}>
            <p className="label-micro mb-2 px-2">{grupo.titulo}</p>
            <ul className="space-y-0.5">
              {visiveis.map((item) => (
                <li key={item.caminho}>
                  <NavLink
                    to={item.caminho}
                    end={item.fim}
                    onClick={aoNavegar}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm transition-all duration-150',
                        isActive
                          ? 'bg-[hsl(var(--surface-raised))] font-medium text-foreground'
                          : 'text-muted-foreground hover:bg-[hsl(var(--surface-raised)/0.6)] hover:text-foreground',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span
                            className="absolute inset-y-1.5 -left-3 w-[3px] rounded-r-full bg-primary"
                            aria-hidden
                          />
                        )}
                        <item.icone
                          className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')}
                        />
                        <span className="truncate">{item.rotulo}</span>
                        {item.modulo === 'ph' && fila.length > 0 && (
                          <span className="num ml-auto rounded-full bg-primary/15 px-1.5 py-0.5 text-[0.65rem] font-medium text-primary">
                            {fila.length}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

/* ---------------- Rodapé da lateral ---------------- */

function RodapeLateral() {
  const { unidade, estado } = useBancada();
  const { trocarUnidade } = useAcoes();

  return (
    <div className="border-t border-[hsl(var(--line-soft))] p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="panel-sunken flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-[hsl(var(--surface-raised))]"
          >
            <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/15 text-xs font-semibold text-primary">
              {unidade.codigo}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-foreground">{unidade.sigla}</span>
              <span className="block truncate text-[0.68rem] text-muted-foreground">{unidade.nome}</span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="label-micro">Unidade operacional</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {estado.unidades.map((u) => (
            <DropdownMenuItem key={u.id} onClick={() => trocarUnidade(u.id)} className="gap-2">
              <span className="num text-xs text-muted-foreground">{u.codigo}</span>
              <span className="truncate">{u.sigla} — {u.nome}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/* ---------------- Topo ---------------- */

function Topo({ aoAbrirMenu }: { aoAbrirMenu: () => void }) {
  const { usuario, papel, tema, alternarTema, estado } = useBancada();
  const { trocarUsuario } = useAcoes();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[hsl(var(--line-soft))] bg-[hsl(var(--background)/0.85)] px-5 backdrop-blur-xl sm:px-8">
      <Button
        variant="ghost"
        size="icon"
        onClick={aoAbrirMenu}
        className="h-8 w-8 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-4 w-4" />
      </Button>

      <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
        <Activity className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
        <span>Bancada operante</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="num">{estado.amostras.filter((a) => a.status === 'em-analise').length} amostras em análise</span>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={alternarTema}
          className="h-8 w-8"
          aria-label={tema === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
        >
          {tema === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-[hsl(var(--surface-raised))]"
            >
              <span
                className="num flex h-7 w-7 items-center justify-center rounded-full text-[0.7rem] font-semibold"
                style={{
                  background: `hsl(${papel?.cor ?? '172 66% 46%'} / 0.18)`,
                  color: `hsl(${papel?.cor ?? '172 66% 46%'})`,
                }}
              >
                {usuario.iniciais}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-xs font-medium leading-tight text-foreground">
                  {usuario.nome.split(' ')[0]} {usuario.nome.split(' ').pop()}
                </span>
                <span className="block text-[0.66rem] leading-tight text-muted-foreground">
                  {papel?.nome}
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{usuario.nome}</p>
              <p className="text-xs font-normal text-muted-foreground">{usuario.cargo}</p>
              <p className="mt-1 text-[0.68rem] font-normal text-muted-foreground">{usuario.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="label-micro">
              Operar como — demonstra as permissões
            </DropdownMenuLabel>
            {estado.usuarios.filter((u) => u.ativo).map((u) => {
              const p = estado.papeis.find((x) => x.id === u.papelId);
              return (
                <DropdownMenuItem
                  key={u.id}
                  onClick={() => trocarUsuario(u.id)}
                  className={cn('gap-2.5', u.id === usuario.id && 'bg-accent')}
                >
                  <span
                    className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.62rem] font-semibold"
                    style={{
                      background: `hsl(${p?.cor ?? '220 12% 55%'} / 0.18)`,
                      color: `hsl(${p?.cor ?? '220 12% 55%'})`,
                    }}
                  >
                    {u.iniciais}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs">{u.nome}</span>
                    <span className="block truncate text-[0.66rem] text-muted-foreground">{p?.nome}</span>
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
