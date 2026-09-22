import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Fora do runtime edge da Vercel, o driver serverless do Neon precisa de um
// construtor de WebSocket — é o que permite usar Postgres normal (com
// transactions, etc.) a partir de uma função serverless de vida curta.
neonConfig.webSocketConstructor = ws;

function createPrismaClient() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// Em dev, o Next recarrega módulos a cada mudança de arquivo — sem esse
// singleton em global, cada reload abriria uma pool de conexões nova.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
