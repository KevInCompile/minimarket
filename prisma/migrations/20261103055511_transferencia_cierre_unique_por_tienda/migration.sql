-- 1) Quitar el unique GLOBAL por fecha.
--    `@unique` sobre `fecha` era global: la fila de una tienda ocupaba la
--    fecha para TODAS las tiendas. Con eso, el upsert de la tienda B se
--    emparejaba con la fila de la tienda A (la misma fecha) y le cambiaba el
--    `tiendaId`: la tienda B se apropiaba del renglón de la tienda A.
--    El índice de "TransferenciaDia" todavía se llama "NequiDelDia_*" porque
--    quedó con el nombre viejo del rename Nequi -> Transferencia.
DROP INDEX IF EXISTS "NequiDelDia_fecha_key";
DROP INDEX IF EXISTS "TransferenciaDia_fecha_key";
DROP INDEX IF EXISTS "CierreDiario_fecha_key";

-- 2) Unique COMPUESTO (fecha, tiendaId): un renglón por día POR TIENDA.
--    Es el índice que Prisma espera para el `@@unique([fecha, tiendaId])`.
CREATE UNIQUE INDEX IF NOT EXISTS "TransferenciaDia_fecha_tiendaId_key"
  ON "TransferenciaDia"("fecha", "tiendaId");
CREATE UNIQUE INDEX IF NOT EXISTS "CierreDiario_fecha_tiendaId_key"
  ON "CierreDiario"("fecha", "tiendaId");
