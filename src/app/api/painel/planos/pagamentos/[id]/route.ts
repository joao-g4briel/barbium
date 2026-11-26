import { NextResponse } from "next/server";
import { z } from "zod";
import { exigirDono } from "@/lib/equipe";
import { ErroPixPlano, confirmarPixDaAssinatura, recusarPixDaAssinatura } from "@/lib/planos-corte";

// Mês de plano pago pela chave Pix da barbearia: o dono conferiu no banco.
// - recebido: o mês passa a valer e o valor entra no caixa;
// - nao-recebido: o pagamento é descartado (o cliente pode gerar outro Pix).
const corpoSchema = z.object({ acao: z.enum(["recebido", "nao-recebido"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirDono();
  if (!sessao) return NextResponse.json({ erro: "Só o dono pode confirmar pagamentos." }, { status: 403 });
  const { id } = await params;
  const dados = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!dados.success) return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });

  try {
    if (dados.data.acao === "recebido") {
      const validaAte = await confirmarPixDaAssinatura(sessao.barbeariaId!, id);
      return NextResponse.json({ ok: true, validaAte: validaAte.toISOString() });
    }
    await recusarPixDaAssinatura(sessao.barbeariaId!, id);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    if (erro instanceof ErroPixPlano) return NextResponse.json({ erro: erro.message }, { status: 409 });
    throw erro;
  }
}
