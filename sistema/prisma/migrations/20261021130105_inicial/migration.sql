-- CreateEnum
CREATE TYPE "public"."Prioridade" AS ENUM ('normal', 'urgente');

-- CreateEnum
CREATE TYPE "public"."StatusOS" AS ENUM ('na_fila', 'em_servico', 'aguardando_peca', 'pronta', 'entregue');

-- CreateEnum
CREATE TYPE "public"."TipoItem" AS ENUM ('peca_comprada', 'peca_reparada', 'mao_de_obra');

-- CreateTable
CREATE TABLE "public"."Cliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "obs" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Van" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "ano" INTEGER,
    "obs" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Van_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OS" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "vanId" TEXT NOT NULL,
    "dataEntrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "km" INTEGER,
    "prioridade" "public"."Prioridade" NOT NULL DEFAULT 'normal',
    "status" "public"."StatusOS" NOT NULL DEFAULT 'na_fila',
    "fixada" BOOLEAN NOT NULL DEFAULT false,
    "previsaoEntrega" TIMESTAMP(3),
    "dataEntrega" TIMESTAMP(3),
    "problemaRelatado" TEXT NOT NULL,
    "problemaReal" TEXT,
    "servicoFeito" TEXT,
    "descontoCentavos" INTEGER NOT NULL DEFAULT 0,
    "validadeDias" INTEGER NOT NULL DEFAULT 7,
    "observacoesOrcamento" TEXT,

    CONSTRAINT "OS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ItemOS" (
    "id" TEXT NOT NULL,
    "osId" TEXT NOT NULL,
    "tipo" "public"."TipoItem" NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "valorUnitarioCentavos" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemOS_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Van_placa_key" ON "public"."Van"("placa");

-- CreateIndex
CREATE INDEX "Van_placa_idx" ON "public"."Van"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "OS_numero_key" ON "public"."OS"("numero");

-- CreateIndex
CREATE INDEX "OS_status_idx" ON "public"."OS"("status");

-- CreateIndex
CREATE INDEX "OS_vanId_idx" ON "public"."OS"("vanId");

-- CreateIndex
CREATE INDEX "ItemOS_osId_idx" ON "public"."ItemOS"("osId");

-- AddForeignKey
ALTER TABLE "public"."Van" ADD CONSTRAINT "Van_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OS" ADD CONSTRAINT "OS_vanId_fkey" FOREIGN KEY ("vanId") REFERENCES "public"."Van"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ItemOS" ADD CONSTRAINT "ItemOS_osId_fkey" FOREIGN KEY ("osId") REFERENCES "public"."OS"("id") ON DELETE CASCADE ON UPDATE CASCADE;
