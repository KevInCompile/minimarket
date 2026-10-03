-- CreateEnum
CREATE TYPE "TipoRetiro" AS ENUM ('ARRIENDO', 'NOMINA', 'SERVICIOS', 'IMPUESTOS', 'PRESTAMO', 'RETIRO_PERSONAL', 'OTRO');

-- AlterTable
ALTER TABLE "Retiro" ADD COLUMN     "nota" TEXT,
ADD COLUMN     "tipo" "TipoRetiro" NOT NULL DEFAULT 'OTRO';

-- CreateIndex
CREATE INDEX "Retiro_tipo_idx" ON "Retiro"("tipo");
