/* ============================================================
   BANCADA — assistente de uso (função no servidor)

   Recebe a conversa do widget, devolve a resposta do Claude em
   streaming (texto puro, pedaço a pedaço).

   A chave da API mora só aqui, na variável ANTHROPIC_API_KEY do
   projeto no Vercel. Ela nunca vai para o navegador: quem abrisse
   as ferramentas do desenvolvedor teria a conta paga na mão.

   Sem chave configurada, responde 503 com `sem_chave`, e o widget
   cai na busca no guia, que funciona sem modelo nenhum.
   ============================================================ */

import Anthropic from '@anthropic-ai/sdk';

import {
  conferirConversa, instrucoesDoAssistente, limparContexto, textoDoContexto,
} from '../src/lims/assistente/guia.js';

const MODELO = 'claude-opus-5-5';

/* As instruções não mudam de uma pergunta para outra, então ficam
   montadas uma vez por instância e entram no cache do modelo: só a
   primeira pergunta paga o guia inteiro. */
const INSTRUCOES = instrucoesDoAssistente();

const json = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export async function GET(): Promise<Response> {
  // Diz se o assistente está pronto, sem expor nada da chave.
  return json(200, { pronto: Boolean(process.env.ANTHROPIC_API_KEY) });
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return json(503, { erro: 'sem_chave' });
  }

  let corpo: unknown;
  try {
    const texto = await request.text();
    // Uma conversa no limite tem uns 40 KB; acima disso não é conversa.
    if (texto.length > 64_000) return json(413, { erro: 'Conversa grande demais.' });
    corpo = JSON.parse(texto);
  } catch {
    return json(400, { erro: 'Requisição inválida.' });
  }

  const { mensagens: brutas, contexto: contextoBruto } = (corpo ?? {}) as Record<string, unknown>;
  const conversa = conferirConversa(brutas);
  if (!conversa.ok) return json(400, { erro: conversa.erro });
  const contexto = limparContexto(contextoBruto);

  const mensagens: Anthropic.Beta.BetaMessageParam[] = conversa.mensagens.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  /* A situação de quem pergunta (tela, papel, modo dos dados) entra
     como mensagem de sistema no fim da conversa, e não nas
     instruções do topo: assim o começo da requisição é sempre igual
     e o cache vale entre perguntas. O texto é montado aqui, a partir
     de campos conferidos contra listas fechadas. */
  if (contexto) {
    mensagens.push({ role: 'system', content: textoDoContexto(contexto) });
  }

  const cliente = new Anthropic();
  const codificador = new TextEncoder();

  const corpoResposta = new ReadableStream<Uint8Array>({
    async start(controle) {
      const escrever = (t: string) => controle.enqueue(codificador.encode(t));
      try {
        const stream = cliente.beta.messages.stream({
          model: MODELO,
          max_tokens: 4000,
          /* Resposta de chat sobre como usar telas: esforço baixo é
             o que a documentação indica para conversa, e deixa a
             resposta começar a aparecer mais rápido. */
          output_config: { effort: 'low' },
          /* Se o modelo principal recusar por um classificador de
             segurança, a API refaz a mesma pergunta num modelo de
             reserva dentro da mesma chamada. */
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          system: [
            { type: 'text', text: INSTRUCOES, cache_control: { type: 'ephemeral' } },
          ],
          messages: mensagens,
        });

        for await (const evento of stream) {
          if (evento.type === 'content_block_delta' && evento.delta.type === 'text_delta') {
            escrever(evento.delta.text);
          }
        }

        const final = await stream.finalMessage();
        if (final.stop_reason === 'refusal') {
          escrever('\n\nNão consigo ajudar com essa pergunta. Posso explicar como usar alguma tela do Bancada?');
        } else if (final.stop_reason === 'max_tokens') {
          escrever('\n\n(A resposta ficou longa demais e foi interrompida. Pergunte por uma parte de cada vez.)');
        }
      } catch (erro) {
        // O começo da resposta já pode ter saído; o aviso vai no fim.
        const motivo = erro instanceof Anthropic.RateLimitError
          ? 'muitas perguntas ao mesmo tempo, tente de novo em instantes'
          : erro instanceof Anthropic.AuthenticationError
            ? 'a chave da API configurada no servidor não foi aceita'
            : erro instanceof Anthropic.APIConnectionError
              ? 'sem conexão com o serviço do assistente'
              : 'erro no serviço do assistente';
        console.error('assistente:', erro);
        escrever(`\n\n[Não foi possível concluir a resposta: ${motivo}.]`);
      } finally {
        controle.close();
      }
    },
  });

  return new Response(corpoResposta, {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      // Sem isto, alguns proxies seguram o texto até o fim.
      'x-accel-buffering': 'no',
    },
  });
}
