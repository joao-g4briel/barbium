-- CreateTable
CREATE TABLE "cakto_pagamentos" (
    "id" TEXT NOT NULL,
    "evento" TEXT NOT NULL,
    "barbeariaId" TEXT,
    "ofertaId" TEXT,
    "tipoOferta" TEXT,
    "valor" DECIMAL(10,2),
    "email" TEXT,
    "resultado" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cakto_pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cakto_pagamentos_barbeariaId_idx" ON "cakto_pagamentos"("barbeariaId");

-- AddForeignKey
ALTER TABLE "cakto_pagamentos" ADD CONSTRAINT "cakto_pagamentos_barbeariaId_fkey" FOREIGN KEY ("barbeariaId") REFERENCES "barbearias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

