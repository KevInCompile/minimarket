/**
 * Backup script: usa pg directamente para hacer SELECT de cada tabla
 * y guarda los datos como JSON en prisma/backups/backup-<timestamp>.json
 */
import { config } from "dotenv";
import { Client } from "pg";
import { writeFile, mkdir } from "node:fs/promises";

config();

const TABLES = [
  "User",
  "Tienda",
  "Proveedor",
  "Gasto",
  "Retiro",
  "TransferenciaDia",
  "CierreDiario",
  "PedidoNota",
];

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const client = new Client({
    connectionString: url,
    // Una base local no soporta SSL; Neon sí. El `sslmode` de la URL decide.
    ssl: /sslmode=disable|localhost|127\.0\.0\.1/.test(url)
      ? false
      : { rejectUnauthorized: false },
  });
  await client.connect();

  console.log("Leyendo datos de la DB...");
  const data: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};

  for (const table of TABLES) {
    // No todas las tablas tienen `createdAt` (CierreDiario no), así que el
    // orden se arma según las columnas que existan.
    const cols = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`,
      [table]
    );
    const orden = cols.rows.some((c) => c.column_name === "createdAt")
      ? 'ORDER BY "createdAt" ASC NULLS LAST'
      : "";
    const result = await client.query(
      `SELECT * FROM "${table}" ${orden}`
    );
    data[table] = result.rows.map((row) => {
      // Convertir Date a ISO string para JSON
      const converted: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        if (v instanceof Date) converted[k] = v.toISOString();
        else if (typeof v === "bigint") converted[k] = v.toString();
        else converted[k] = v;
      }
      return converted;
    });
    counts[table] = result.rows.length;
    console.log(`  ${table}: ${result.rows.length} filas`);
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);

  const dir = "prisma/backups";
  await mkdir(dir, { recursive: true });
  const file = `${dir}/backup-${timestamp}.json`;
  await writeFile(
    file,
    JSON.stringify(
      {
        timestamp,
        counts,
        sourceDb: process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":***@"),
        data,
      },
      null,
      2
    )
  );

  console.log(`\n✓ Backup guardado en: ${file}`);
  console.log(`Total filas: ${Object.values(counts).reduce((a, b) => a + b, 0)}`);

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
