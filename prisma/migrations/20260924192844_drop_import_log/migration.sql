/*
  Warnings:

  - You are about to drop the column `importId` on the `CierreDiario` table. All the data in the column will be lost.
  - You are about to drop the column `importId` on the `Gasto` table. All the data in the column will be lost.
  - You are about to drop the column `importId` on the `NequiDelDia` table. All the data in the column will be lost.
  - You are about to drop the column `importId` on the `PedidoNota` table. All the data in the column will be lost.
  - You are about to drop the column `importId` on the `Retiro` table. All the data in the column will be lost.
  - You are about to drop the `ImportLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CierreDiario" DROP CONSTRAINT "CierreDiario_importId_fkey";

-- DropForeignKey
ALTER TABLE "Gasto" DROP CONSTRAINT "Gasto_importId_fkey";

-- DropForeignKey
ALTER TABLE "ImportLog" DROP CONSTRAINT "ImportLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "NequiDelDia" DROP CONSTRAINT "NequiDelDia_importId_fkey";

-- DropForeignKey
ALTER TABLE "PedidoNota" DROP CONSTRAINT "PedidoNota_importId_fkey";

-- DropForeignKey
ALTER TABLE "Retiro" DROP CONSTRAINT "Retiro_importId_fkey";

-- DropIndex
DROP INDEX "CierreDiario_importId_idx";

-- DropIndex
DROP INDEX "Gasto_importId_idx";

-- DropIndex
DROP INDEX "NequiDelDia_importId_idx";

-- DropIndex
DROP INDEX "PedidoNota_importId_idx";

-- DropIndex
DROP INDEX "Retiro_importId_idx";

-- AlterTable
ALTER TABLE "CierreDiario" DROP COLUMN "importId";

-- AlterTable
ALTER TABLE "Gasto" DROP COLUMN "importId";

-- AlterTable
ALTER TABLE "NequiDelDia" DROP COLUMN "importId";

-- AlterTable
ALTER TABLE "PedidoNota" DROP COLUMN "importId";

-- AlterTable
ALTER TABLE "Retiro" DROP COLUMN "importId";

-- DropTable
DROP TABLE "ImportLog";
