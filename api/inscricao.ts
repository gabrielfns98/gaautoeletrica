// Função do Vercel: recebe a inscrição do curso e avisa a oficina no WhatsApp.
//
// Envio via CallMeBot (gratuito para mandar mensagens para o PRÓPRIO número).
// Variáveis de ambiente no projeto do Vercel (Settings → Environment Variables):
//   CALLMEBOT_APIKEY  → chave que o bot do CallMeBot manda no WhatsApp
//   CALLMEBOT_PHONE   → (opcional) número que recebe o aviso; padrão +5534998667638

// Mesmos valores de src/config/curso.ts (mantidos aqui para a função não depender do front).
const PRECO = { pix: 400, link: 450 } as const;

const EXPERIENCIA: Record<string, string> = {
  nenhuma: "Nunca mexeu com elétrica",
  basica: "Sabe o básico",
  trabalho_na_area: "Já trabalha na área",
};

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// Limite simples contra abuso (por instância da função).
const ultimos = new Map<string, number[]>();
const limiteExcedido = (ip: string) => {
  const agora = Date.now();
  const lista = (ultimos.get(ip) ?? []).filter((t) => agora - t < 10 * 60_000);
  lista.push(agora);
  ultimos.set(ip, lista);
  return lista.length > 5;
};

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "corpo inválido" }, 400);
  }

  // Campo-isca preenchido = robô. Responde "ok" sem enviar nada.
  if (texto(body.empresa, 100)) return json({ ok: true });

  const nome = texto(body.nome, 120);
  const whatsapp = texto(body.whatsapp, 20);
  const digitos = whatsapp.replace(/\D/g, "");
  const forma = body.forma_pagamento === "link" ? "link" : body.forma_pagamento === "pix" ? "pix" : null;
  if (nome.length < 3 || ![10, 11].includes(digitos.length) || !forma) {
    return json({ ok: false, error: "dados inválidos" }, 400);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "?";
  if (limiteExcedido(ip)) return json({ ok: false, error: "muitas tentativas" }, 429);

  const apikey = process.env.CALLMEBOT_APIKEY;
  const phone = process.env.CALLMEBOT_PHONE || "+5534998667638";
  if (!apikey) return json({ ok: false, error: "CALLMEBOT_APIKEY não configurada" }, 500);

  const cpf = texto(body.cpf, 14);
  const email = texto(body.email, 160);
  const cidade = texto(body.cidade, 80);
  const experiencia = EXPERIENCIA[texto(body.experiencia, 30)];

  const mensagem = [
    "🎄 *Nova inscrição: Treinamento de Natal*",
    "",
    `👤 *${nome}*`,
    `📱 ${whatsapp}: https://wa.me/55${digitos}`,
    cpf ? `🪪 CPF: ${cpf}` : null,
    email ? `📧 ${email}` : null,
    cidade ? `📍 ${cidade}` : null,
    experiencia ? `🔧 ${experiencia}` : null,
    `💳 Vai pagar no ${forma === "pix" ? "Pix" : "cartão"} (${brl(PRECO[forma])})`,
    "",
    "⏳ Aguardando pagamento/comprovante",
  ]
    .filter((l) => l !== null)
    .join("\n");

  const url =
    "https://api.callmebot.com/whatsapp.php" +
    `?phone=${encodeURIComponent(phone)}` +
    `&text=${encodeURIComponent(mensagem)}` +
    `&apikey=${encodeURIComponent(apikey)}`;

  try {
    const resp = await fetch(url);
    const corpo = await resp.text();
    if (!resp.ok || /error|invalid/i.test(corpo)) throw new Error(corpo.slice(0, 300));
    return json({ ok: true });
  } catch (e) {
    console.error("Falha ao enviar aviso no WhatsApp:", e);
    return json({ ok: false, error: "falha no envio do aviso" }, 502);
  }
}
