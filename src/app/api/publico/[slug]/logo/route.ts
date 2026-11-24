import { prisma } from "@/lib/prisma";

// Logo público da barbearia. O link leva ?v=<data da troca>, então pode ficar
// em cache por muito tempo: trocar o logo muda o endereço.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const logo = await prisma.barbeariaLogo.findFirst({
    where: { barbearia: { slug } },
    select: { dados: true, tipo: true },
  });
  if (!logo) return new Response("Não encontrado", { status: 404 });
  return new Response(new Uint8Array(logo.dados), {
    headers: {
      "Content-Type": logo.tipo,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
