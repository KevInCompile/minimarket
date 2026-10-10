/**
 * Seed: crea los usuarios iniciales vinculados a una tienda default.
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Creando tienda y usuarios...");

  const adminPassword = await hash("admin123", 10);
  const cajeroPassword = await hash("cajero123", 10);

  const tienda = await prisma.tienda.upsert({
    where: { slug: "tienda-demo" },
    update: {},
    create: {
      nombre: "Tienda Demo",
      slug: "tienda-demo",
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@ejemplo.com" },
    update: { tiendaId: tienda.id },
    create: {
      email: "admin@ejemplo.com",
      passwordHash: adminPassword,
      nombre: "Administrador",
      role: "ADMIN",
      tiendaId: tienda.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "cajero@ejemplo.com" },
    update: { tiendaId: tienda.id },
    create: {
      email: "cajero@ejemplo.com",
      passwordHash: cajeroPassword,
      nombre: "Cajero",
      role: "CAJERO",
      tiendaId: tienda.id,
    },
  });

  console.log(`\n✓ Seed completo.`);
  console.log(`  Tienda: ${tienda.nombre} (${tienda.slug})`);
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
