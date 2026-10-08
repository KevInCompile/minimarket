/**
 * Seed: crea los usuarios iniciales.
 *
 * A partir de ahora NO se cargan datos transaccionales — el admin los
 * ingresa a mano desde la app.
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Creando usuarios...");

  const adminPassword = await hash("admin123", 10);
  const cajeroPassword = await hash("cajero123", 10);

  await prisma.user.upsert({
    where: { email: "admin@ejemplo.com" },
    update: {},
    create: {
      email: "admin@ejemplo.com",
      passwordHash: adminPassword,
      nombre: "Administrador",
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "cajero@ejemplo.com" },
    update: {},
    create: {
      email: "cajero@ejemplo.com",
      passwordHash: cajeroPassword,
      nombre: "Cajero",
      role: "CAJERO",
    },
  });

  console.log(`\n✓ Seed completo. Tablas transaccionales vacías — cargá datos desde la app.`);
  console.log(`  Usuarios:`);
  console.log(`    ADMIN  → admin@ejemplo.com / admin123`);
  console.log(`    CAJERO → cajero@ejemplo.com / cajero123`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
