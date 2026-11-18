#!/usr/bin/env bash
# Backup de la base de datos Neon a CSV.
# Uso: ./scripts/backup.sh
#
# Genera un directorio con un CSV por tabla en prisma/backups/backup-<timestamp>/

set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "❌ No se encontró .env"
  exit 1
fi

# Cargar DATABASE_URL desde .env
DATABASE_URL=$(grep '^DATABASE_URL=' .env | sed 's/DATABASE_URL=//' | tr -d '"')

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL no está definida en .env"
  exit 1
fi

# `psql` no entiende los parámetros que Prisma mete en la URL (por ejemplo
# `?schema=public`): los rechaza y aborta el backup. Se sacan.
PSQL_URL="${DATABASE_URL%%\?*}"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="prisma/backups/backup-${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

TABLES=("User" "Tienda" "Proveedor" "Gasto" "Retiro" "TransferenciaDia" "CierreDiario" "PedidoNota")

echo "📦 Backup a: $BACKUP_DIR"
echo ""

TOTAL=0
for table in "${TABLES[@]}"; do
  count=$(psql "$PSQL_URL" -t -c "SELECT COUNT(*) FROM public.\"$table\"" 2>/dev/null | tr -d ' ')
  if [ -n "$count" ] && [ "$count" != "0" ]; then
    psql "$PSQL_URL" -c "\\COPY public.\"$table\" TO '$BACKUP_DIR/$table.csv' WITH (FORMAT CSV, HEADER TRUE)" 2>/dev/null
    size=$(stat -f%z "$BACKUP_DIR/$table.csv" 2>/dev/null || echo "0")
    echo "  ✓ $table: $count filas ($size bytes)"
    TOTAL=$((TOTAL + count))
  else
    echo "  - $table: 0 filas (skip)"
  fi
done

echo ""
echo "✓ Backup completo. Total: $TOTAL filas en $BACKUP_DIR"
echo "  Para restaurar: psql \"\\\$PSQL_URL\" -c \"\\\\COPY public.\\\"<tabla>\\\" FROM '$BACKUP_DIR/<tabla>.csv' WITH (FORMAT CSV, HEADER TRUE)\""
