import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { renovarTokenMercadoPago } from "@/lib/sinal";

// Chamada uma vez por dia pelo Vercel Cron (vercel.json). Renova, com folga,
// os tokens do Mercado Pago conectados pelo botão (valem 180 dias). Se a
// renovação falhar vários dias seguidos e o token vencer, a barbearia deixa de
// receber pelo Mercado Pago até conectar de novo (o painel avisa).
// Autorização igual à do outro cron (CRON_SECRET).

export const dynamic = "force-dynamic";

const ANTECEDENCIA_DIAS = 30;
const MAXIMO_POR_CHAMADA = 50;

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
  const limite = new Date(Date.now() + ANTECEDENCIA_DIAS * 24 * 60 * 60 * 1000);
  const configs = await prisma.configuracaoPagamento.findMany({
    where: { mpRefreshTokenCifrado: { not: null }, mpTokenExpiraEm: { lt: limite } },
    select: { barbeariaId: true },
    orderBy: { mpTokenExpiraEm: "asc" },
    take: MAXIMO_POR_CHAMADA,
  });
  let renovados = 0;
  let falhas = 0;
  for (const { barbeariaId } of configs) {
    try {
      if (await renovarTokenMercadoPago(barbeariaId)) renovados++;
    } catch (erro) {
      falhas++;
      console.error("Renovar token do Mercado Pago (cron):", barbeariaId, erro instanceof Error ? erro.message : erro);
    }
  }
  return NextResponse.json({ consultados: configs.length, renovados, falhas });
}
