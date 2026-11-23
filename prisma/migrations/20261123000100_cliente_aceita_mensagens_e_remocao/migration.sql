-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "aceitaMensagens" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "removidoEm" TIMESTAMP(3);

