import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import bcrypt from "bcryptjs";

neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const nome = process.env.SUPER_ADMIN_NOME;
  const email = process.env.SUPER_ADMIN_EMAIL;
  const senha = process.env.SUPER_ADMIN_SENHA;

  if (!nome || !email || !senha) {
    throw new Error(
      "Defina SUPER_ADMIN_NOME, SUPER_ADMIN_EMAIL e SUPER_ADMIN_SENHA no .env antes de rodar o seed.",
    );
  }

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    console.log(`Já existe um usuário com o e-mail ${email}. Nada a fazer.`);
    return;
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  await prisma.usuario.create({
    data: { nome, email, senhaHash, role: "SUPER_ADMIN", barbeariaId: null },
  });

  console.log(`Super admin criado: ${email}`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
