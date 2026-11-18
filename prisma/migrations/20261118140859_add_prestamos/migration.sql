-- CreateTable
CREATE TABLE "Prestamo" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "persona" TEXT NOT NULL,
    "valor" INTEGER NOT NULL,
    "nota" TEXT,
    "pagado" BOOLEAN NOT NULL DEFAULT false,
    "fechaPago" DATE,
    "tiendaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prestamo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Prestamo_tiendaId_idx" ON "Prestamo"("tiendaId");

-- CreateIndex
CREATE INDEX "Prestamo_fecha_idx" ON "Prestamo"("fecha");

-- AddForeignKey
ALTER TABLE "Prestamo" ADD CONSTRAINT "Prestamo_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prestamo" ADD CONSTRAINT "Prestamo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
