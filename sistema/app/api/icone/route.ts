import { lerIcone } from "@/lib/db";
import { OFICINA } from "@/lib/oficina";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ícone do app instalado: a logo enviada ou um fallback com a inicial. */
export async function GET() {
  const logo = await lerIcone();
  const casa = logo?.match(/^data:(image\/[a-z+]+);base64,(.+)$/);

  if (casa) {
    return new Response(Buffer.from(casa[2], "base64"), {
      headers: {
        "Content-Type": casa[1],
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  const letra = OFICINA.nome.slice(0, 1).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="${OFICINA.corPrimaria}"/><text x="50%" y="52%" dominant-baseline="central" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="300" font-weight="bold" fill="#ffffff">${letra}</text></svg>`;

  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=300" },
  });
}
