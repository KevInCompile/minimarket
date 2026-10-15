-- 1) Agregar valor 'TRANSFERENCIA' al enum PagadoCon (idempotente)
-- Postgres requiere que ALTER TYPE ADD VALUE se ejecute fuera de la
-- transaccion que usa el nuevo value. Prisma migrate deploy envuelve cada
-- migracion en su propia transaccion, asi que este ALTER debe ir solo en
-- el archivo (sin otros statements que dependan del nuevo value).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum
                 WHERE enumlabel = 'TRANSFERENCIA'
                   AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PagadoCon')) THEN
    ALTER TYPE "PagadoCon" ADD VALUE 'TRANSFERENCIA';
  END IF;
END$$;
