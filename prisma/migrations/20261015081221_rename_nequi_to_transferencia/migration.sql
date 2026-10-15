-- 1) Renombrar enum value: 'NEQUI' -> 'TRANSFERENCIA' (idempotente)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum
              WHERE enumlabel = 'NEQUI'
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SaleDe')) THEN
    ALTER TYPE "SaleDe" RENAME VALUE 'NEQUI' TO 'TRANSFERENCIA';
  END IF;
END$$;

-- 2) Renombrar la tabla 'NequiDelDia' -> 'TransferenciaDia' si existe (idempotente)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_name = 'NequiDelDia' AND table_schema = 'public') THEN
    -- Renombrar FKs
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NequiDelDia_tiendaId_fkey') THEN
      ALTER TABLE "NequiDelDia" RENAME CONSTRAINT "NequiDelDia_tiendaId_fkey" TO "TransferenciaDia_tiendaId_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NequiDelDia_userId_fkey') THEN
      ALTER TABLE "NequiDelDia" RENAME CONSTRAINT "NequiDelDia_userId_fkey" TO "TransferenciaDia_userId_fkey";
    END IF;
    -- Renombrar indices
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'NequiDelDia_tiendaId_idx') THEN
      ALTER INDEX "NequiDelDia_tiendaId_idx" RENAME TO "TransferenciaDia_tiendaId_idx";
    END IF;
    -- Renombrar la tabla
    ALTER TABLE "NequiDelDia" RENAME TO "TransferenciaDia";
  END IF;
END$$;

-- 3) Renombrar columna 'nequiDelDia' -> 'transferenciaDelDia' en 'CierreDiario' (idempotente)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'CierreDiario'
      AND column_name = 'nequiDelDia'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE "CierreDiario" RENAME COLUMN "nequiDelDia" TO "transferenciaDelDia";
  END IF;
END$$;
