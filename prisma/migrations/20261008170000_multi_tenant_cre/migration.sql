-- 1. Crear la tabla Tienda
CREATE TABLE "Tienda" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Tienda_pkey" PRIMARY KEY ("id")
);

-- 2. Insertar tienda default
INSERT INTO "Tienda" (id, nombre, slug, "createdAt", "updatedAt")
VALUES ('tienda-default', 'Tienda Demo', 'tienda-demo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 3. Tienda unique slug
CREATE UNIQUE INDEX "Tienda_slug_key" ON "Tienda"("slug");

-- 4. Agregar columna tiendaId con default a la tienda default (datos existentes)
ALTER TABLE "User" ADD COLUMN "tiendaId" TEXT NOT NULL DEFAULT 'tienda-default';
ALTER TABLE "Proveedor" ADD COLUMN "tiendaId" TEXT NOT NULL DEFAULT 'tienda-default';
ALTER TABLE "Gasto" ADD COLUMN "tiendaId" TEXT NOT NULL DEFAULT 'tienda-default';
ALTER TABLE "Retiro" ADD COLUMN "tiendaId" TEXT NOT NULL DEFAULT 'tienda-default';
ALTER TABLE "NequiDelDia" ADD COLUMN "tiendaId" TEXT NOT NULL DEFAULT 'tienda-default';
ALTER TABLE "CierreDiario" ADD COLUMN "tiendaId" TEXT NOT NULL DEFAULT 'tienda-default';
ALTER TABLE "PedidoNota" ADD COLUMN "tiendaId" TEXT NOT NULL DEFAULT 'tienda-default';

-- 5. FKs
ALTER TABLE "User" ADD CONSTRAINT "User_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Proveedor" ADD CONSTRAINT "Proveedor_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Retiro" ADD CONSTRAINT "Retiro_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NequiDelDia" ADD CONSTRAINT "NequiDelDia_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CierreDiario" ADD CONSTRAINT "CierreDiario_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PedidoNota" ADD CONSTRAINT "PedidoNota_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. Índices
CREATE INDEX "User_tiendaId_idx" ON "User"("tiendaId");
CREATE INDEX "Proveedor_tiendaId_idx" ON "Proveedor"("tiendaId");
CREATE INDEX "Gasto_tiendaId_idx" ON "Gasto"("tiendaId");
CREATE INDEX "Retiro_tiendaId_idx" ON "Retiro"("tiendaId");
CREATE INDEX "NequiDelDia_tiendaId_idx" ON "NequiDelDia"("tiendaId");
CREATE INDEX "CierreDiario_tiendaId_idx" ON "CierreDiario"("tiendaId");
CREATE INDEX "PedidoNota_tiendaId_idx" ON "PedidoNota"("tiendaId");

-- 7. Unique constraint en (nombre, tiendaId) para Proveedor
CREATE UNIQUE INDEX "Proveedor_nombre_tiendaId_key" ON "Proveedor"("nombre", "tiendaId");
DROP INDEX "Proveedor_nombre_key";
