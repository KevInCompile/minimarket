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
  "Proveedor",
  "Gasto",
  "Retiro",
  "NequiDelDia",
  "CierreDiario",
  "PedidoNota",
];

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  console.log("Leyendo datos de la DB...");
  const data: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};

  for (const table of TABLES) {
    const result = await client.query(
      `SELECT * FROM "${table}" ORDER BY "createdAt" ASC NULLS LAST`
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
