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

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="prisma/backups/backup-${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

TABLES=("User" "Proveedor" "Gasto" "Retiro" "NequiDelDia" "CierreDiario" "PedidoNota")

echo "📦 Backup a: $BACKUP_DIR"
echo ""

TOTAL=0
for table in "${TABLES[@]}"; do
  count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM public.\"$table\"" 2>/dev/null | tr -d ' ')
  if [ -n "$count" ] && [ "$count" != "0" ]; then
    psql "$DATABASE_URL" -c "\\COPY public.\"$table\" TO '$BACKUP_DIR/$table.csv' WITH (FORMAT CSV, HEADER TRUE)" 2>/dev/null
    size=$(stat -f%z "$BACKUP_DIR/$table.csv" 2>/dev/null || echo "0")
    echo "  ✓ $table: $count filas ($size bytes)"
    TOTAL=$((TOTAL + count))
  else
    echo "  - $table: 0 filas (skip)"
  fi
done

echo ""
echo "✓ Backup completo. Total: $TOTAL filas en $BACKUP_DIR"
echo "  Para restaurar: psql \"\\\$DATABASE_URL\" -c \"\\\\COPY public.\\\"<tabla>\\\" FROM '$BACKUP_DIR/<tabla>.csv' WITH (FORMAT CSV, HEADER TRUE)\""
