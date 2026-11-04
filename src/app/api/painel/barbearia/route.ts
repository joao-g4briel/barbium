import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/equipe";
import { numeroWhatsApp } from "@/lib/formatar";

// Nome, telefone e WhatsApp dos avisos. O link (slug) e o plano ficam com a plataforma: trocar o
// link quebraria o que já foi divulgado aos clientes.
const corpoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da barbearia."),
  telefone: z.string().trim().nullable(),
  telefoneAvisos: z.string().trim().nullable().optional(),
});

export async function PATCH(request: Request) {
  const sessao = await exigirDono();
  if (!sessao) return NextResponse.json({ erro: "Só o dono pode editar a barbearia." }, { status: 403 });

  const dados = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!dados.success) {
    const nossa = dados.error.issues.find((i) => i.message.startsWith("Informe"))?.message;
    return NextResponse.json({ erro: nossa ?? "Dados inválidos." }, { status: 400 });
  }

  const telefone = dados.data.telefone ? dados.data.telefone.replace(/\D/g, "") : "";
  if (telefone && telefone.length < 8) {
    return NextResponse.json({ erro: "Informe um telefone válido, com DDD." }, { status: 400 });
  }

  // Aviso vai por WhatsApp: precisa de DDD pra montar o número.
  const telefoneAvisos = dados.data.telefoneAvisos ? dados.data.telefoneAvisos.replace(/\D/g, "") : "";
  if (telefoneAvisos && !numeroWhatsApp(telefoneAvisos)) {
    return NextResponse.json({ erro: "Informe o WhatsApp dos avisos com DDD." }, { status: 400 });
  }

  await prisma.barbearia.update({
    where: { id: sessao.barbeariaId! },
    data: {
      nome: dados.data.nome,
      telefone: telefone || null,
      ...(dados.data.telefoneAvisos !== undefined ? { telefoneAvisos: telefoneAvisos || null } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}
