import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/equipe";

// Logo da barbearia. O navegador reduz a imagem antes de enviar (até 512px),
// então aqui chega pequena; mesmo assim o tamanho e o tipo são conferidos.
const TIPOS = ["image/png", "image/jpeg", "image/webp"];
const MAXIMO_BYTES = 200 * 1024;

const corpoSchema = z.object({ dataUrl: z.string().max(400_000) });

function decodificar(dataUrl: string): { tipo: string; dados: Uint8Array<ArrayBuffer> } | null {
  const m = /^data:(image\/(?:png|jpeg|webp));base64,([a-z0-9+/=]+)$/i.exec(dataUrl);
  if (!m || !TIPOS.includes(m[1].toLowerCase())) return null;
  const dados = Buffer.from(m[2], "base64");
  // Confere a assinatura do arquivo, não só o que o navegador declarou.
  const png = dados.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = dados[0] === 0xff && dados[1] === 0xd8;
  const webp = dados.toString("ascii", 0, 4) === "RIFF" && dados.toString("ascii", 8, 12) === "WEBP";
  if (!png && !jpeg && !webp) return null;
  return { tipo: png ? "image/png" : jpeg ? "image/jpeg" : "image/webp", dados: new Uint8Array(dados) };
}

export async function POST(request: Request) {
  const sessao = await exigirDono();
  if (!sessao) return NextResponse.json({ erro: "Só o dono pode trocar o logo." }, { status: 403 });

  const corpo = corpoSchema.safeParse(await request.json().catch(() => null));
  const imagem = corpo.success ? decodificar(corpo.data.dataUrl) : null;
  if (!imagem) return NextResponse.json({ erro: "Envie uma imagem PNG, JPG ou WebP." }, { status: 400 });
  if (imagem.dados.length > MAXIMO_BYTES) {
    return NextResponse.json({ erro: "Imagem muito grande. Use uma de até 200 KB." }, { status: 400 });
  }

  const barbeariaId = sessao.barbeariaId!;
  await prisma.$transaction([
    prisma.barbeariaLogo.upsert({
      where: { barbeariaId },
      create: { barbeariaId, dados: imagem.dados, tipo: imagem.tipo },
      update: { dados: imagem.dados, tipo: imagem.tipo },
    }),
    prisma.barbearia.update({ where: { id: barbeariaId }, data: { logoAtualizadoEm: new Date() } }),
  ]);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const sessao = await exigirDono();
  if (!sessao) return NextResponse.json({ erro: "Só o dono pode remover o logo." }, { status: 403 });
  const barbeariaId = sessao.barbeariaId!;
  await prisma.$transaction([
    prisma.barbeariaLogo.deleteMany({ where: { barbeariaId } }),
    prisma.barbearia.update({ where: { id: barbeariaId }, data: { logoAtualizadoEm: null } }),
  ]);
  return NextResponse.json({ ok: true });
}
