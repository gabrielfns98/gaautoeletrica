// Envia um aviso no WhatsApp da G.A. Auto Elétrica a cada nova inscrição no curso.
//
// Envio via CallMeBot (gratuito para mandar mensagens para o PRÓPRIO número).
// Secrets necessários no Supabase (Edge Functions > Secrets):
//   CALLMEBOT_APIKEY  → chave recebida do bot no WhatsApp
//   CALLMEBOT_PHONE   → (opcional) número que recebe o aviso; padrão +5534998667638
//
// A função só envia dados que já estão salvos no banco e avisa cada inscrição uma única vez.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const EXPERIENCIA: Record<string, string> = {
  nenhuma: "Nunca mexeu",
  basica: "Sabe o básico",
  trabalho_na_area: "Já trabalha na área",
};

const brl = (v: number | null) =>
  v == null ? "" : ` (${v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "método não permitido" }, 405);

  const apikey = Deno.env.get("CALLMEBOT_APIKEY");
  const phone = Deno.env.get("CALLMEBOT_PHONE") ?? "+5534998667638";
  if (!apikey) return json({ ok: false, error: "CALLMEBOT_APIKEY não configurada" }, 500);

  let codigo: unknown;
  try {
    ({ codigo } = await req.json());
  } catch {
    return json({ error: "corpo inválido" }, 400);
  }
  if (typeof codigo !== "string" || !/^[A-Z0-9]{4,25}$/.test(codigo)) {
    return json({ error: "código inválido" }, 400);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Marca como notificada de forma atômica: se já foi avisada, não envia de novo.
  const { data: insc, error } = await supabase
    .from("course_registrations")
    .update({ notificado_em: new Date().toISOString() })
    .eq("codigo", codigo)
    .is("notificado_em", null)
    .select("*")
    .maybeSingle();

  if (error) return json({ ok: false, error: error.message }, 500);
  if (!insc) return json({ ok: true, skipped: true });

  const { count } = await supabase
    .from("course_registrations")
    .select("id", { count: "exact", head: true })
    .eq("turma", insc.turma)
    .neq("status", "cancelado");

  const zapAluno = "55" + String(insc.whatsapp).replace(/\D/g, "");
  const linhas = [
    "🎄 *Nova inscrição — Treinamento de Natal*",
    "",
    `👤 *${insc.nome}*`,
    `📱 ${insc.whatsapp} — https://wa.me/${zapAluno}`,
    insc.cpf ? `🪪 CPF: ${insc.cpf}` : null,
    insc.email ? `📧 ${insc.email}` : null,
    insc.cidade ? `📍 ${insc.cidade}` : null,
    insc.experiencia ? `🔧 ${EXPERIENCIA[insc.experiencia] ?? insc.experiencia}` : null,
    `💳 Vai pagar no ${insc.forma_pagamento === "pix" ? "Pix" : "cartão"}${brl(insc.valor)}`,
    `🔖 Código: ${insc.codigo}`,
    "",
    "⏳ Aguardando pagamento/comprovante",
    count != null ? `👥 Total de inscritos: ${count}` : null,
  ].filter((l) => l !== null);

  const url =
    "https://api.callmebot.com/whatsapp.php" +
    `?phone=${encodeURIComponent(phone)}` +
    `&text=${encodeURIComponent(linhas.join("\n"))}` +
    `&apikey=${encodeURIComponent(apikey)}`;

  try {
    const resp = await fetch(url);
    const corpo = await resp.text();
    if (!resp.ok || /error|invalid/i.test(corpo)) throw new Error(corpo.slice(0, 300));
    return json({ ok: true });
  } catch (e) {
    // Desfaz a marcação para permitir nova tentativa.
    await supabase.from("course_registrations").update({ notificado_em: null }).eq("id", insc.id);
    return json({ ok: false, error: String(e) }, 502);
  }
});
