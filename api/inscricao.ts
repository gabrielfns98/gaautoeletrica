// Função do Vercel: recebe a inscrição do curso e repassa para a oficina.
//
// Destinos (configure um ou os dois em Settings → Environment Variables do projeto):
//   Planilha Google (Apps Script em docs/inscricoes-google-sheets.gs):
//     SHEETS_WEBHOOK_URL → URL do app da Web do Apps Script (termina em /exec)
//     SHEETS_TOKEN       → mesmo token escrito no script
//   WhatsApp via CallMeBot (gratuito para mandar mensagens para o PRÓPRIO número):
//     CALLMEBOT_APIKEY   → chave que o bot do CallMeBot manda no WhatsApp
//     CALLMEBOT_PHONE    → (opcional) número que recebe o aviso; padrão +5534998667638

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

  const cpf = texto(body.cpf, 14);
  const email = texto(body.email, 160);
  const cidade = texto(body.cidade, 80);
  const experiencia = EXPERIENCIA[texto(body.experiencia, 30)] ?? "";
  const pagamento = forma === "pix" ? "Pix" : "Cartão";
  const valor = PRECO[forma];

  const destinos: Promise<string>[] = [];

  const sheetsUrl = process.env.SHEETS_WEBHOOK_URL;
  if (sheetsUrl) {
    destinos.push(
      (async () => {
        const resp = await fetch(sheetsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: process.env.SHEETS_TOKEN ?? "",
            nome,
            whatsapp,
            cpf,
            email,
            cidade,
            experiencia,
            pagamento,
            valor,
          }),
        });
        const corpo = await resp.text();
        if (!resp.ok || !corpo.includes('"ok":true')) throw new Error(`planilha: ${corpo.slice(0, 200)}`);
        return "planilha";
      })(),
    );
  }

  const apikey = process.env.CALLMEBOT_APIKEY;
  if (apikey) {
    const phone = process.env.CALLMEBOT_PHONE || "+5534998667638";
    const mensagem = [
      "🎄 *Nova inscrição: Treinamento de Natal*",
      "",
      `👤 *${nome}*`,
      `📱 ${whatsapp}: https://wa.me/55${digitos}`,
      cpf ? `🪪 CPF: ${cpf}` : null,
      email ? `📧 ${email}` : null,
      cidade ? `📍 ${cidade}` : null,
      experiencia ? `🔧 ${experiencia}` : null,
      `💳 Vai pagar no ${forma === "pix" ? "Pix" : "cartão"} (${brl(valor)})`,
      "",
      "⏳ Aguardando pagamento",
    ]
      .filter((l) => l !== null)
      .join("\n");
    const url =
      "https://api.callmebot.com/whatsapp.php" +
      `?phone=${encodeURIComponent(phone)}` +
      `&text=${encodeURIComponent(mensagem)}` +
      `&apikey=${encodeURIComponent(apikey)}`;
    destinos.push(
      (async () => {
        const resp = await fetch(url);
        const corpo = await resp.text();
        if (!resp.ok || /error|invalid/i.test(corpo)) throw new Error(`whatsapp: ${corpo.slice(0, 200)}`);
        return "whatsapp";
      })(),
    );
  }

  if (!destinos.length) return json({ ok: false, error: "nenhum destino configurado" }, 500);

  const resultados = await Promise.allSettled(destinos);
  const enviados = resultados.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  for (const r of resultados) if (r.status === "rejected") console.error("Falha ao repassar inscrição:", r.reason);

  return enviados.length
    ? json({ ok: true, enviados })
    : json({ ok: false, error: "falha ao repassar a inscrição" }, 502);
}
