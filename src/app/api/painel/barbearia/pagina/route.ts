import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/equipe";
import { corValida } from "@/lib/cor-marca";
import { MENSAGEM_AGENDAMENTO_MAXIMO, antecedenciaValida, diasAFrenteValido } from "@/lib/pagina-agendamento";

// Página de agendamento: endereço, cor da marca (o logo tem rota própria) e
// as regras e o recado do link. Cada campo é opcional: só muda o que vier.
const corpoSchema = z.object({
  endereco: z.string().trim().max(200, "Endereço muito longo (até 200 caracteres).").nullable().optional(),
  corMarca: z
    .string()
    .trim()
    .refine((c) => corValida(c), "Cor inválida.")
    .nullable()
    .optional(),
  mensagemAgendamento: z
    .string()
    .trim()
    .max(MENSAGEM_AGENDAMENTO_MAXIMO, `Recado muito longo (até ${MENSAGEM_AGENDAMENTO_MAXIMO} caracteres).`)
    .nullable()
    .optional(),
  mostrarPrecos: z.boolean().optional(),
  corFundo: z
    .string()
    .trim()
    .refine((c) => corValida(c), "Cor de fundo inválida.")
    .nullable()
    .optional(),
  temaNoPainel: z.boolean().optional(),
  antecedenciaMinimaMin: z.number().int().refine(antecedenciaValida, "Antecedência inválida.").optional(),
  diasAFrente: z.number().int().refine(diasAFrenteValido, "Período inválido.").optional(),
});

export async function PATCH(request: Request) {
  const sessao = await exigirDono();
  if (!sessao) return NextResponse.json({ erro: "Só o dono pode editar a página de agendamento." }, { status: 403 });

  const dados = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!dados.success) return NextResponse.json({ erro: dados.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  const d = dados.data;

  await prisma.barbearia.update({
    where: { id: sessao.barbeariaId! },
    data: {
      ...(d.endereco !== undefined ? { endereco: d.endereco || null } : {}),
      ...(d.corMarca !== undefined ? { corMarca: d.corMarca ? d.corMarca.toLowerCase() : null } : {}),
      ...(d.mensagemAgendamento !== undefined ? { mensagemAgendamento: d.mensagemAgendamento || null } : {}),
      ...(d.mostrarPrecos !== undefined ? { mostrarPrecos: d.mostrarPrecos } : {}),
      ...(d.corFundo !== undefined ? { corFundo: d.corFundo ? d.corFundo.toLowerCase() : null } : {}),
      ...(d.temaNoPainel !== undefined ? { temaNoPainel: d.temaNoPainel } : {}),
      ...(d.antecedenciaMinimaMin !== undefined ? { antecedenciaMinimaMin: d.antecedenciaMinimaMin } : {}),
      ...(d.diasAFrente !== undefined ? { diasAFrente: d.diasAFrente } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}
