-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CAJERO');

-- CreateEnum
CREATE TYPE "PagadoCon" AS ENUM ('CAJA', 'EFECTIVO');

-- CreateEnum
CREATE TYPE "SaleDe" AS ENUM ('EFECTIVO', 'NEQUI', 'CAJA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CAJERO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gasto" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "valor" INTEGER NOT NULL,
    "pagadoCon" "PagadoCon" NOT NULL,
    "nota" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Retiro" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "concepto" TEXT NOT NULL,
    "valor" INTEGER NOT NULL,
    "saleDe" "SaleDe" NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Retiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NequiDelDia" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "total" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NequiDelDia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CierreDiario" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "cajaApertura" INTEGER NOT NULL DEFAULT 0,
    "cajaCierre" INTEGER NOT NULL DEFAULT 0,
    "efectivoGuardado" INTEGER NOT NULL DEFAULT 0,
    "efectivoRealContado" INTEGER,
    "userIdCierre" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CierreDiario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoNota" (
    "id" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "valor" INTEGER NOT NULL,
    "dia" TEXT NOT NULL,
    "estado" TEXT,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PedidoNota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportLog" (
    "id" TEXT NOT NULL,
    "archivo" TEXT NOT NULL,
    "filasCreadas" INTEGER NOT NULL,
    "errores" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Proveedor_nombre_key" ON "Proveedor"("nombre");

-- CreateIndex
CREATE INDEX "Gasto_fecha_idx" ON "Gasto"("fecha");

-- CreateIndex
CREATE INDEX "Gasto_proveedorId_idx" ON "Gasto"("proveedorId");

-- CreateIndex
CREATE INDEX "Gasto_userId_idx" ON "Gasto"("userId");

-- CreateIndex
CREATE INDEX "Retiro_fecha_idx" ON "Retiro"("fecha");

-- CreateIndex
CREATE INDEX "Retiro_userId_idx" ON "Retiro"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NequiDelDia_fecha_key" ON "NequiDelDia"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "CierreDiario_fecha_key" ON "CierreDiario"("fecha");

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retiro" ADD CONSTRAINT "Retiro_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NequiDelDia" ADD CONSTRAINT "NequiDelDia_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CierreDiario" ADD CONSTRAINT "CierreDiario_userIdCierre_fkey" FOREIGN KEY ("userIdCierre") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoNota" ADD CONSTRAINT "PedidoNota_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportLog" ADD CONSTRAINT "ImportLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
