import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { enviarAvisosDeTeste } from "@/lib/avisos-teste";

// Chamada uma vez por dia pelo Vercel Cron (vercel.json). Se CRON_SECRET
// estiver configurada na Vercel, só aceita a chamada com
// "Authorization: Bearer <CRON_SECRET>" (a Vercel manda sozinha). Sem ela,
// aceita qualquer chamada: cada aviso é marcado antes de sair, então chamar de
// novo não repete nada.

export const dynamic = "force-dynamic";

function autorizado(request: Request): boolean {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return true;
  const recebido = request.headers.get("authorization") ?? "";
  const esperado = `Bearer ${segredo}`;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!autorizado(request)) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  try {
    return NextResponse.json(await enviarAvisosDeTeste());
  } catch (erro) {
    console.error("Avisos de teste:", erro);
    return NextResponse.json({ erro: "Falha ao enviar os avisos." }, { status: 500 });
  }
}
