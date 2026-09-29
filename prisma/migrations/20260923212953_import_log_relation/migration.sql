-- AlterTable
ALTER TABLE "CierreDiario" ADD COLUMN     "importId" TEXT;

-- AlterTable
ALTER TABLE "Gasto" ADD COLUMN     "importId" TEXT;

-- AlterTable
ALTER TABLE "ImportLog" ADD COLUMN     "revertido" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "NequiDelDia" ADD COLUMN     "importId" TEXT;

-- AlterTable
ALTER TABLE "PedidoNota" ADD COLUMN     "importId" TEXT;

-- AlterTable
ALTER TABLE "Retiro" ADD COLUMN     "importId" TEXT;

-- CreateIndex
CREATE INDEX "CierreDiario_importId_idx" ON "CierreDiario"("importId");

-- CreateIndex
CREATE INDEX "Gasto_importId_idx" ON "Gasto"("importId");

-- CreateIndex
CREATE INDEX "NequiDelDia_importId_idx" ON "NequiDelDia"("importId");

-- CreateIndex
CREATE INDEX "PedidoNota_importId_idx" ON "PedidoNota"("importId");

-- CreateIndex
CREATE INDEX "Retiro_importId_idx" ON "Retiro"("importId");

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ImportLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retiro" ADD CONSTRAINT "Retiro_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ImportLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NequiDelDia" ADD CONSTRAINT "NequiDelDia_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ImportLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CierreDiario" ADD CONSTRAINT "CierreDiario_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ImportLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoNota" ADD CONSTRAINT "PedidoNota_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ImportLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
