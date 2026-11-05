/* ============================================================
   BANCADA — casca da aplicação
   Barra lateral por módulo (filtrada por permissão), topo com
   unidade ativa, troca de tema e seleção do operador.
   ============================================================ */

import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity, Award, Barcode, Beaker, Boxes, Check, ChevronDown, ClipboardList, Eye, FileCheck2,
  FlaskConical, Gauge, Layers, LayoutDashboard, LogOut, Menu, Moon, Receipt, ScrollText,
  Settings, ShieldCheck, Sun, TableProperties, TestTubes, Upload, Users, Wallet, X,
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
import { nomeCurto } from '../lib/format';
import { Assistente } from './Assistente';
import { COMERCIAL_ADIADO, adiado } from '../escopo';
import { ROTULO_MODULO } from '../lib/rbac';
import { MODULOS } from '../types';
import type { Modulo, Papel } from '../types';
import { rota } from '../base';

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
      { modulo: 'dashboard', rotulo: 'Painel', caminho: rota(), icone: LayoutDashboard, fim: true },
      /* Clientes vem antes da Recepção porque é o primeiro passo: o
         lote é protocolado para um cliente. */
      ...(COMERCIAL_ADIADO
        ? [{ modulo: 'crm' as Modulo, rotulo: 'Clientes', caminho: rota('/crm'), icone: Users }]
        : []),
      { modulo: 'recepcao', rotulo: 'Recepção', caminho: rota('/recepcao'), icone: ClipboardList },
      { modulo: 'amostras', rotulo: 'Importação', caminho: rota('/importacao'), icone: Upload },
      { modulo: 'amostras', rotulo: 'Etiquetas', caminho: rota('/etiquetas'), icone: Barcode },
      { modulo: 'amostras', rotulo: 'Amostras', caminho: rota('/amostras'), icone: TestTubes },
      { modulo: 'ph', rotulo: 'Bancada', caminho: rota('/bancada'), icone: Gauge },
      { modulo: 'analises', rotulo: 'Resultados', caminho: rota('/resultados'), icone: TableProperties },
      { modulo: 'analises', rotulo: 'Revisão', caminho: rota('/ensaios'), icone: FlaskConical },
      { modulo: 'analises', rotulo: 'Qualidade', caminho: rota('/qualidade'), icone: Award },
      { modulo: 'laudos', rotulo: 'Laudos', caminho: rota('/laudos'), icone: FileCheck2 },
    ],
  },
  {
    titulo: 'Comercial',
    itens: [
      ...(COMERCIAL_ADIADO
        ? []
        : [{ modulo: 'crm' as Modulo, rotulo: 'CRM', caminho: rota('/crm'), icone: Users }]),
      { modulo: 'financeiro' as Modulo, rotulo: 'Financeiro', caminho: rota('/financeiro'), icone: Wallet },
      { modulo: 'fiscal' as Modulo, rotulo: 'Fiscal', caminho: rota('/fiscal'), icone: Receipt },
    ].filter((i: ItemNav) => !adiado(i.modulo)),
  },
  {
    titulo: 'Recursos',
    itens: [
      { modulo: 'estoque', rotulo: 'Estoque', caminho: rota('/estoque'), icone: Boxes },
      { modulo: 'equipamentos', rotulo: 'Equipamentos', caminho: rota('/equipamentos'), icone: Beaker },
    ],
  },
  {
    titulo: 'Administração',
    itens: [
      { modulo: 'configuracoes', rotulo: 'Cadastros', caminho: rota('/cadastros'), icone: Layers },
      { modulo: 'usuarios', rotulo: 'Usuários e papéis', caminho: rota('/usuarios'), icone: ShieldCheck },
      { modulo: 'auditoria', rotulo: 'Auditoria', caminho: rota('/auditoria'), icone: ScrollText },
      { modulo: 'configuracoes', rotulo: 'Configurações', caminho: rota('/configuracoes'), icone: Settings },
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
              <AvisoVerComo />
              <Outlet />
            </div>
          </main>
        </div>
        <Assistente />
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
      <span className="faixa-marca absolute inset-x-0 bottom-0 h-px opacity-60" aria-hidden />
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

/* ---------------- Ver como ---------------- */

/** Os módulos do papel que estão guardados para a próxima fase. */
function alcanceDoPapel(papel: Papel | undefined) {
  const vistos = MODULOS.filter((m) => papel?.permissoes.includes(`${m}:ver`));
  return { adiados: vistos.filter((m) => adiado(m)) };
}

/**
 * Seletor de papel. Serve para apresentar o sistema: "é isto que o
 * analista vê, é isto que a recepção vê". Não cria usuário nenhum.
 */
function VerComo() {
  const { papel, papelReal, podeVerComo, verComo, estado } = useBancada();
  if (!podeVerComo) return null;
  const outro = papel?.id !== papelReal?.id;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={outro ? 'default' : 'outline'}
          size="sm"
          className="h-8 gap-1.5 text-xs"
          aria-label={`Ver o sistema como outro papel. Agora: ${papel?.nome ?? 'sem papel'}`}
        >
          <Eye className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Ver como:</span>
          <span className="max-w-[9rem] truncate">{papel?.nome ?? '—'}</span>
          <ChevronDown className="h-3 w-3 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Mostra o sistema como cada papel enxerga. Ninguém é cadastrado e o que for gravado
          continua no seu nome.
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {estado.papeis.map((p) => (
          <DropdownMenuItem key={p.id} onClick={() => verComo(p.id)} className="gap-2.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: `hsl(${p.cor})` }} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs">
                {p.nome}{p.id === papelReal?.id && <span className="text-muted-foreground"> (o seu)</span>}
              </span>
            </span>
            {p.id === papel?.id && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Aviso fixo enquanto outro papel está sendo mostrado. */
function AvisoVerComo() {
  const { papel, papelReal, usuario, verComo } = useBancada();
  if (!papel || papel.id === papelReal?.id) return null;

  const { adiados } = alcanceDoPapel(papel);
  /* O Financeiro é descrito como "contas a receber e notas fiscais",
     e esses módulos estão guardados para a próxima fase. Sem dizer
     isso, quem olha lê a descrição, não acha nada daquilo no menu e
     conclui que o sistema está quebrado. */
  const nomesAdiados = adiados.map((m) => ROTULO_MODULO[m].toLowerCase());

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
      <Eye className="h-4 w-4 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 text-foreground">
        Você está vendo o sistema como <strong>{papel.nome}</strong>. {papel.descricao}
        {nomesAdiados.length > 0 && (
          <span className="mt-1 block text-muted-foreground">
            Os módulos {nomesAdiados.join(' e ')} deste papel estão previstos para a próxima fase
            e ainda não aparecem no menu.
          </span>
        )}
        <span className="mt-1 block text-xs text-muted-foreground">
          O que for gravado agora fica no nome de {usuario.nome}.
        </span>
      </p>
      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => verComo(null)}>
        Voltar para {papelReal?.nome ?? 'o meu papel'}
      </Button>
    </div>
  );
}

/* ---------------- Topo ---------------- */

function Topo({ aoAbrirMenu }: { aoAbrirMenu: () => void }) {
  const { usuario, papel, tema, alternarTema, estado, modo, sair, demonstracao } = useBancada();
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

      {/* Massa fictícia não pode passar por dado real: quem está vendo
          a demonstração precisa saber disso em toda tela, inclusive
          antes de imprimir um laudo. */}
      {demonstracao ? (
        <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/10 px-2 py-1 text-xs text-[hsl(var(--warning))]">
          <FlaskConical className="h-3.5 w-3.5" />
          <span>Dados de demonstração</span>
        </div>
      ) : (
        <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <Activity className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
          <span>Bancada operante</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="num">{estado.amostras.filter((a) => a.status === 'em-analise').length} amostras em análise</span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        <VerComo />
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
                  {nomeCurto(usuario.nome)}
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
            {modo === 'banco' ? (
              <>
                <DropdownMenuLabel className="label-micro">
                  {papel?.nome ?? 'Sem papel'}
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => void sair()} className="gap-2.5">
                  <LogOut className="h-4 w-4" />
                  <span className="text-xs">Sair da conta</span>
                </DropdownMenuItem>
              </>
            ) : null}
            {modo === 'banco' ? null : (
            <DropdownMenuLabel className="label-micro">
              Operar como — demonstra as permissões
            </DropdownMenuLabel>
            )}
            {modo === 'banco' ? [] : estado.usuarios.filter((u) => u.ativo).map((u) => {
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
