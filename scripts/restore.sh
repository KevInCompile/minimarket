#!/usr/bin/env bash
# Restaura los datos de la DB desde un backup CSV.
# Uso: ./scripts/restore.sh [timestamp]
#
# Sin argumentos: lista los backups disponibles y pide elegir uno.
# Con argumento: restaura desde prisma/backups/backup-<timestamp>/

set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "❌ No se encontró .env"
  exit 1
fi

DATABASE_URL=$(grep '^DATABASE_URL=' .env | sed 's/DATABASE_URL=//' | tr -d '"')

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL no está definida en .env"
  exit 1
fi

BACKUPS_ROOT="prisma/backups"

# Listar backups si no se pasó argumento
if [ -z "${1:-}" ]; then
  echo "📦 Backups disponibles:"
  echo ""
  if [ ! -d "$BACKUPS_ROOT" ] || [ -z "$(ls -A "$BACKUPS_ROOT" 2>/dev/null)" ]; then
    echo "  (no hay backups)"
    echo ""
    echo "  Cree uno con: ./scripts/backup.sh"
    exit 0
  fi
  ls -1 "$BACKUPS_ROOT" | sort -r | while read -r dir; do
    if [ -d "$BACKUPS_ROOT/$dir" ]; then
      ts=${dir#backup-}
      size=$(du -sh "$BACKUPS_ROOT/$dir" 2>/dev/null | cut -f1)
      files=$(ls -1 "$BACKUPS_ROOT/$dir" 2>/dev/null | wc -l | tr -d ' ')
      echo "  $ts  ($files archivos, $size)"
    fi
  done
  echo ""
  echo "Uso: $0 <timestamp> [--confirm]"
  echo "  --confirm  no pide confirmación antes de borrar"
  exit 0
fi

TIMESTAMP="$1"
BACKUP_DIR="$BACKUPS_ROOT/backup-$TIMESTAMP"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "❌ No existe el backup: $BACKUP_DIR"
  echo "Backups disponibles:"
  ls -1 "$BACKUPS_ROOT" 2>/dev/null | grep "^backup-" | sed "s/backup-/  /"
  exit 1
fi

# Confirmar si no se pasó --confirm
if [ "${2:-}" != "--confirm" ]; then
  echo "⚠️  Va a restaurar datos desde:"
  echo "    $BACKUP_DIR"
  echo ""
  echo "Esto BORRARÁ los datos actuales en las tablas del backup."
  read -p "¿Continuar? (s/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
    echo "Cancelado."
    exit 0
  fi
fi

echo ""
echo "📥 Restaurando desde $BACKUP_DIR"
echo ""

# Orden importante: respetar FKs
TABLES=(
  "User"
  "Proveedor"
  "Gasto"
  "Retiro"
  "NequiDelDia"
  "CierreDiario"
  "PedidoNota"
)

# Borrar con CASCADE para respetar FKs
for table in "${TABLES[@]}"; do
  psql "$DATABASE_URL" -c "SET search_path TO public; TRUNCATE TABLE \"$table\" CASCADE" 2>/dev/null
done

# Restaurar
for table in "${TABLES[@]}"; do
  file="$BACKUP_DIR/$table.csv"
  if [ -f "$file" ] && [ -s "$file" ]; then
    psql "$DATABASE_URL" -c "\\COPY public.\"$table\" FROM '$file' WITH (FORMAT CSV, HEADER TRUE)" 2>/dev/null
    count=$(psql "$DATABASE_URL" -t -c "SET search_path TO public; SELECT COUNT(*) FROM \"$table\"" 2>/dev/null | tr -d ' ')
    echo "  ✓ $table: $count filas"
  else
    echo "  - $table: (no en backup, skip)"
  fi
done

echo ""
echo "✓ Restauración completa"
