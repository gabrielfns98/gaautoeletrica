/* ============================================================
   BANCADA — widget do assistente

   Um botão no canto da tela que abre uma conversa sobre como usar o
   sistema. A pergunta vai para o servidor junto com o que ajuda a
   responder: em que tela a pessoa está, qual o papel dela, que menus
   ela enxerga e se os dados estão sendo gravados.

   Quando o servidor não tem o modelo disponível (chave não
   configurada, sem rede, ambiente local sem a função), o widget
   continua útil: procura no guia o trecho que responde e avisa que
   está respondendo pelo guia, não pelo assistente.
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { BookOpen, LifeBuoy, Send, Square, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import { useBancada } from '../data/store';
import {
  LIMITE_CARACTERES, SUGESTOES, TELAS, buscarNoGuia, telaDoCaminho,
} from '../assistente/guia';
import type { ContextoTela, MensagemChat } from '../assistente/guia';
import type { Modulo } from '../types';

/** Que módulo cada tela exige, para dizer ao assistente o que o papel enxerga. */
const MODULO_DA_TELA: Record<string, Modulo> = {
  Painel: 'dashboard', Clientes: 'crm', 'Recepção': 'recepcao', 'Importação': 'amostras',
  Etiquetas: 'amostras', Amostras: 'amostras', Bancada: 'ph', Resultados: 'analises',
  'Revisão': 'analises', Qualidade: 'analises', Laudos: 'laudos', Estoque: 'estoque',
  Equipamentos: 'equipamentos', 'Usuários e papéis': 'usuarios', Auditoria: 'auditoria',
  Cadastros: 'configuracoes', 'Configurações': 'configuracoes',
};

interface Mensagem extends MensagemChat {
  /** resposta montada a partir do guia, sem o modelo */
  doGuia?: boolean;
}

/* ---------------- Texto da resposta ---------------- */

/** Negrito com **asteriscos**, sem interpretar HTML nenhum. */
function comNegrito(linha: string): ReactNode[] {
  return linha.split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
    parte.startsWith('**') && parte.endsWith('**') && parte.length > 4
      ? <strong key={i} className="font-semibold">{parte.slice(2, -2)}</strong>
      : <span key={i}>{parte}</span>);
}

/**
 * Formata a resposta: parágrafos, listas numeradas e com marcador.
 * Feito à mão, e não com HTML, porque o texto vem do modelo — que
 * repete trechos da pergunta — e nada dele deve virar marcação.
 */
function Texto({ texto }: { texto: string }) {
  const blocos = texto.split(/\n{2,}/);
  return (
    <div className="space-y-2">
      {blocos.map((bloco, i) => {
        const linhas = bloco.split('\n').filter((l) => l.trim() !== '');
        const lista = linhas.length > 0 && linhas.every((l) => /^\s*(\d+[.)]|[-•*])\s+/.test(l));
        if (lista) {
          const numerada = /^\s*\d/.test(linhas[0]);
          const Tag = numerada ? 'ol' : 'ul';
          return (
            <Tag key={i} className={cn('space-y-1 pl-5', numerada ? 'list-decimal' : 'list-disc')}>
              {linhas.map((l, j) => (
                <li key={j}>{comNegrito(l.replace(/^\s*(\d+[.)]|[-•*])\s+/, '').replace(/^#+\s*/, ''))}</li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line">
            {comNegrito(bloco.replace(/^#+\s*/gm, ''))}
          </p>
        );
      })}
    </div>
  );
}

/** A resposta sem modelo: os trechos do guia que casam com a pergunta. */
function respostaDoGuia(pergunta: string): string {
  const achados = buscarNoGuia(pergunta);
  if (achados.length === 0) {
    return 'Não achei isso no guia. Tente com outras palavras, por exemplo o nome do menu '
      + '(Clientes, Recepção, Resultados, Laudos) ou do que você quer fazer.';
  }
  return achados.map((t) => `**${t.titulo}**\n${t.texto}`).join('\n\n');
}

/* ---------------- Widget ---------------- */

export function Assistente() {
  const { estado, papel, modo, demonstracao, podeVerModulo } = useBancada();
  const local = useLocation();
  const tela = telaDoCaminho(local.pathname);

  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [rascunho, setRascunho] = useState('');
  const [respondendo, setRespondendo] = useState(false);
  /** o servidor disse que não há modelo: as próximas respostas vêm do guia */
  const [soGuia, setSoGuia] = useState(false);

  const fim = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const cancelar = useRef<AbortController | null>(null);

  useEffect(() => { fim.current?.scrollIntoView({ block: 'end' }); }, [mensagens]);
  useEffect(() => { if (aberto) campo.current?.focus(); }, [aberto]);
  useEffect(() => () => cancelar.current?.abort(), []);

  const contexto = useMemo<ContextoTela>(() => ({
    tela,
    papel: papel?.nome ?? '',
    modo: modo === 'banco' ? 'banco' : demonstracao ? 'demonstracao' : 'vazio',
    modulos: Object.values(TELAS).filter((t) => podeVerModulo(MODULO_DA_TELA[t])),
    contagens: {
      clientes: estado.clientes.length,
      usuarios: estado.usuarios.length,
      amostras: estado.amostras.length,
      laudos: estado.laudos.length,
    },
  }), [tela, papel, modo, demonstracao, podeVerModulo, estado.clientes.length,
    estado.usuarios.length, estado.amostras.length, estado.laudos.length]);

  const sugestoes = SUGESTOES[tela] ?? SUGESTOES.Painel;

  const responder = async (pergunta: string) => {
    const texto = pergunta.trim();
    if (!texto || respondendo) return;
    if (texto.length > LIMITE_CARACTERES) return;

    const conversa: Mensagem[] = [...mensagens, { role: 'user', content: texto }];
    setMensagens(conversa);
    setRascunho('');

    if (soGuia) {
      setMensagens([...conversa, { role: 'assistant', content: respostaDoGuia(texto), doGuia: true }]);
      return;
    }

    setRespondendo(true);
    const controle = new AbortController();
    cancelar.current = controle;
    // A resposta do guia não volta ao modelo: ela não foi escrita por ele.
    const historico = conversa
      .filter((m) => !m.doGuia)
      .map(({ role, content }) => ({ role, content }));

    try {
      const resposta = await fetch('/api/assistente', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mensagens: historico, contexto }),
        signal: controle.signal,
      });

      const tipo = resposta.headers.get('content-type') ?? '';
      if (!resposta.ok || !resposta.body || !tipo.startsWith('text/plain')) {
        /* 503 sem chave, 404 no ambiente local, HTML de erro de um
           proxy: em todos os casos, o guia responde. */
        setSoGuia(true);
        setMensagens([...conversa, { role: 'assistant', content: respostaDoGuia(texto), doGuia: true }]);
        return;
      }

      const leitor = resposta.body.getReader();
      const decodificador = new TextDecoder();
      let acumulado = '';
      setMensagens([...conversa, { role: 'assistant', content: '' }]);
      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        acumulado += decodificador.decode(value, { stream: true });
        const parcial = acumulado;
        setMensagens([...conversa, { role: 'assistant', content: parcial }]);
      }
      if (!acumulado.trim()) {
        setMensagens([...conversa, { role: 'assistant', content: respostaDoGuia(texto), doGuia: true }]);
      }
    } catch (erro) {
      if ((erro as Error).name === 'AbortError') return;
      setMensagens([...conversa, { role: 'assistant', content: respostaDoGuia(texto), doGuia: true }]);
    } finally {
      setRespondendo(false);
      cancelar.current = null;
    }
  };

  const aoTeclar = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void responder(rascunho);
    }
  };

  return (
    <div className="sem-impressao">
      {aberto && (
        <section
          role="dialog"
          aria-label="Assistente do Bancada"
          onKeyDown={(e) => { if (e.key === 'Escape') setAberto(false); }}
          className="fixed bottom-20 right-4 z-50 flex max-h-[min(72vh,40rem)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[hsl(var(--line))] bg-background shadow-2xl"
        >
          <header className="flex items-center gap-2 border-b border-[hsl(var(--line-soft))] px-4 py-3">
            <LifeBuoy className="h-4 w-4 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Assistente do Bancada</p>
              <p className="truncate text-[0.68rem] text-muted-foreground">
                {soGuia ? 'Respondendo pelo guia do sistema' : `Ajuda sobre a tela ${tela}`}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAberto(false)} aria-label="Fechar assistente">
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm" aria-live="polite">
            {mensagens.length === 0 && (
              <div className="space-y-3">
                <p className="text-muted-foreground">
                  Pergunte como fazer algo no sistema: cadastrar, protocolar, lançar, aprovar, emitir laudo.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {sugestoes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void responder(s)}
                      className="rounded-full border border-[hsl(var(--line))] px-2.5 py-1 text-xs text-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mensagens.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[88%] rounded-[var(--radius-md)] px-3 py-2 leading-relaxed',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-[hsl(var(--surface-sunken))] text-foreground',
                  )}
                >
                  {m.role === 'assistant' && m.doGuia && (
                    <p className="mb-1.5 flex items-center gap-1 text-[0.66rem] uppercase tracking-wide text-muted-foreground">
                      <BookOpen className="h-3 w-3" /> do guia
                    </p>
                  )}
                  {m.role === 'assistant'
                    ? (m.content ? <Texto texto={m.content} /> : <span className="text-muted-foreground">Pensando…</span>)
                    : <p className="whitespace-pre-line">{m.content}</p>}
                </div>
              </div>
            ))}
            <div ref={fim} />
          </div>

          <footer className="border-t border-[hsl(var(--line-soft))] p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={campo}
                value={rascunho}
                onChange={(e) => setRascunho(e.target.value)}
                onKeyDown={aoTeclar}
                rows={2}
                maxLength={LIMITE_CARACTERES}
                placeholder="Escreva sua dúvida…"
                aria-label="Sua pergunta"
                className="min-h-[2.5rem] flex-1 resize-none rounded-[var(--radius-sm)] border border-[hsl(var(--line))] bg-[hsl(var(--surface-sunken))] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {respondendo ? (
                <Button size="icon" variant="outline" onClick={() => cancelar.current?.abort()} aria-label="Parar a resposta">
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button size="icon" onClick={() => void responder(rascunho)} disabled={!rascunho.trim()} aria-label="Enviar pergunta">
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="mt-1.5 text-[0.64rem] text-muted-foreground">
              O assistente pode errar. Confira antes de agir sobre um resultado ou um laudo.
            </p>
          </footer>
        </section>
      )}

      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-label={aberto ? 'Fechar assistente' : 'Abrir assistente de ajuda'}
        aria-expanded={aberto}
        className="fixed bottom-4 right-4 z-50 flex h-12 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {aberto ? <X className="h-4 w-4" /> : <LifeBuoy className="h-4 w-4" />}
        <span>{aberto ? 'Fechar' : 'Ajuda'}</span>
      </button>
    </div>
  );
}
