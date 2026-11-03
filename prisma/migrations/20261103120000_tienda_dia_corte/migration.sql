-- Dia de corte del periodo contable de cada tienda.
-- Con 1 el periodo es el mes calendario; con 15 va del 15 de un mes al 14
-- del siguiente. Se limita a 28 porque todos los meses tienen ese dia.
ALTER TABLE "Tienda"
  ADD COLUMN IF NOT EXISTS "diaCorte" INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Tienda_diaCorte_check'
  ) THEN
    ALTER TABLE "Tienda"
      ADD CONSTRAINT "Tienda_diaCorte_check"
      CHECK ("diaCorte" BETWEEN 1 AND 28);
  END IF;
END$$;
