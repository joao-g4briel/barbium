-- AlterTable
ALTER TABLE "barbearias" ADD COLUMN     "corMarca" TEXT,
ADD COLUMN     "endereco" TEXT,
ADD COLUMN     "logoAtualizadoEm" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "barbearia_logos" (
    "barbeariaId" TEXT NOT NULL,
    "dados" BYTEA NOT NULL,
    "tipo" TEXT NOT NULL,

    CONSTRAINT "barbearia_logos_pkey" PRIMARY KEY ("barbeariaId")
);

-- AddForeignKey
ALTER TABLE "barbearia_logos" ADD CONSTRAINT "barbearia_logos_barbeariaId_fkey" FOREIGN KEY ("barbeariaId") REFERENCES "barbearias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

