/**
 * Seed de minimarket.
 *
 * Uso:
 *   pnpm db:seed                    genera datos de prueba (12 meses)
 *   pnpm db:seed -- --meses=6       genera 6 meses
 *   pnpm db:seed -- --semilla=42    cambia la semilla (otra tanda de datos)
 *   pnpm db:seed -- --mantener       no borra los datos existentes
 *   pnpm db:seed -- --forzar        permite correr contra una DB remota
 *
 * IMPORTANTE: por defecto SOLO corre contra una base local. La base de
 * datos de produccion tiene datos reales y no se deben pisar por
 * accidente, asi que si la URL no es localhost el seed se niega a
 * seguir. Con --forzar se acepta el riesgo.
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import {
  generarDatos,
  NOMBRES_PROVEEDOR,
  hostDe,
  puedeEscribir,
} from "./seed-data";

const prisma = new PrismaClient();

type Args = {
  meses: number;
  semilla: number;
  mantener: boolean;
  forzar: boolean;
  confirmar: string | null;
};

function leerArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string): string | null => {
    const hit = argv.find((a) => a.startsWith(`--${flag}=`));
    return hit ? hit.split("=")[1]! : null;
  };
  return {
    meses: Number(get("meses") ?? 12),
    semilla: Number(get("semilla") ?? 20261015),
    mantener: argv.includes("--mantener"),
    forzar: argv.includes("--forzar"),
    confirmar: get("confirmar-produccion"),
  };
}

async function main() {
  const args = leerArgs();
  const url = process.env.DATABASE_URL ?? "";
  const host = hostDe(url);

  const permiso = puedeEscribir(host, {
    forzar: args.forzar,
    confirmar: args.confirmar,
  });
  if (!permiso.permitido) {
    console.error(
      `\n✖ Se niega a escribir en la base de datos "${host}".\n` +
        `  ${permiso.motivo}\n` +
        `  Los datos de produccion son reales y este seed los borra.\n`,
    );
    process.exit(1);
  }
  if (host) {
    console.log(`⚠ Escribiendo en una base de datos remota: ${host}`);
  }

  console.log("Creando tienda y usuarios...");
  const adminPassword = await hash("admin123", 10);
  const cajeroPassword = await hash("cajero123", 10);

  const tienda = await prisma.tienda.upsert({
    where: { slug: "tienda-demo" },
    update: {},
    create: {
      nombre: "Tienda Demo",
      slug: "tienda-demo",
      email: "contacto@tienda-demo.co",
      telefono: "+57 300 123 4567",
      direccion: "Calle 45 # 12-30, Bogota",
    },
  });

  const admin = await prisma.user.upsert({
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

  const cajero = await prisma.user.upsert({
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

  // Un par de usuarios mas para que la pantalla de usuarios no quede
  // con una sola fila.
  const usuariosExtra = [
    { email: "cajero2@ejemplo.com", nombre: "Cajero Turno Mañana", role: "CAJERO" as const },
    { email: "cajero3@ejemplo.com", nombre: "Cajero Turno Tarde", role: "CAJERO" as const },
    { email: "supervisor@ejemplo.com", nombre: "Supervisor de Tienda", role: "ADMIN" as const },
  ];

  const usuarios = [admin, cajero];
  for (const u of usuariosExtra) {
    const creado = await prisma.user.upsert({
      where: { email: u.email },
      update: { tiendaId: tienda.id },
      create: {
        email: u.email,
        passwordHash: cajeroPassword,
        nombre: u.nombre,
        role: u.role,
        tiendaId: tienda.id,
      },
    });
    usuarios.push(creado);
  }

  if (!args.mantener) {
    console.log("Limpiando datos operacionales anteriores...");
    // El orden importa por las foreign keys. Los usuarios y la tienda se
    // conservan: no se tocan las cuentas.
    await prisma.pedidoNota.deleteMany({ where: { tiendaId: tienda.id } });
    await prisma.cierreDiario.deleteMany({ where: { tiendaId: tienda.id } });
    await prisma.transferenciaDia.deleteMany({ where: { tiendaId: tienda.id } });
    await prisma.retiro.deleteMany({ where: { tiendaId: tienda.id } });
    await prisma.gasto.deleteMany({ where: { tiendaId: tienda.id } });
    await prisma.proveedor.deleteMany({ where: { tiendaId: tienda.id } });
  }

  console.log(
    `Generando ${args.meses} meses de datos (semilla ${args.semilla})...`,
  );
  const datos = generarDatos({
    meses: args.meses,
    semilla: args.semilla,
  });

  /* Proveedores --------------------------------------------------------- */
  console.log(`  ${NOMBRES_PROVEEDOR.length} proveedores...`);
  await prisma.proveedor.createMany({
    data: NOMBRES_PROVEEDOR.map((nombre, i) => ({
      nombre,
      tiendaId: tienda.id,
      // Un par quedan inactivos para probar el filtro de proveedores
      // activos.
      activo: i !== NOMBRES_PROVEEDOR.length - 1,
    })),
    skipDuplicates: true,
  });

  const proveedores = await prisma.proveedor.findMany({
    where: { tiendaId: tienda.id },
    select: { id: true, nombre: true },
  });
  const idProveedor = new Map(proveedores.map((p) => [p.nombre, p.id]));

  /* Gastos -------------------------------------------------------------- */
  console.log(`  ${datos.gastos.length} gastos...`);
  await prisma.gasto.createMany({
    data: datos.gastos
      .filter((g) => idProveedor.has(g.proveedor))
      .map((g) => ({
        fecha: g.fecha,
        proveedorId: idProveedor.get(g.proveedor)!,
        valor: g.valor,
        pagadoCon: g.pagadoCon,
        nota: g.nota,
        tiendaId: tienda.id,
        userId: usuarios[g.usuario]!.id,
      })),
  });

  /* Retiros ------------------------------------------------------------- */
  console.log(`  ${datos.retiros.length} retiros...`);
  await prisma.retiro.createMany({
    data: datos.retiros.map((r) => ({
      fecha: r.fecha,
      tipo: r.tipo,
      concepto: r.concepto,
      valor: r.valor,
      saleDe: r.saleDe,
      nota: r.nota,
      tiendaId: tienda.id,
      userId: usuarios[r.usuario]!.id,
    })),
  });

  /* Transferencias ------------------------------------------------------ */
  console.log(`  ${datos.transferencias.length} dias con Transferencia...`);
  await prisma.transferenciaDia.createMany({
    data: datos.transferencias.map((t) => ({
      fecha: t.fecha,
      total: t.total,
      tiendaId: tienda.id,
      userId: usuarios[t.usuario]!.id,
    })),
    skipDuplicates: true,
  });

  /* Cierres ------------------------------------------------------------- */
  console.log(`  ${datos.cierres.length} cierres diarios...`);
  await prisma.cierreDiario.createMany({
    data: datos.cierres.map((c) => ({
      fecha: c.fecha,
      cajaApertura: c.cajaApertura,
      cajaCierre: c.cajaCierre,
      efectivoGuardado: c.efectivoGuardado,
      efectivoRealContado: c.efectivoRealContado,
      tiendaId: tienda.id,
      userIdCierre: usuarios[c.usuario]!.id,
    })),
    skipDuplicates: true,
  });

  /* Pedidos (nota) ------------------------------------------------------ */
  console.log(`  ${datos.pedidos.length} pedidos en la nota...`);
  await prisma.pedidoNota.createMany({
    data: datos.pedidos
      .filter((p) => idProveedor.has(p.proveedor))
      .map((p) => ({
        proveedorId: idProveedor.get(p.proveedor)!,
        valor: p.valor,
        dia: p.dia,
        estado: p.estado,
        nota: p.nota,
        tiendaId: tienda.id,
      })),
  });

  const totalGastos = datos.gastos.reduce((s, g) => s + g.valor, 0);

  console.log(`\n✓ Seed completo.`);
  console.log(`  Tienda: ${tienda.nombre} (${tienda.slug})`);
  console.log(`  Datos en ${datos.resumen.dias} dias (${args.meses} meses):`);
  console.log(`    ${datos.gastos.length} gastos por ${totalGastos.toLocaleString("es-CO")} COP`);
  console.log(`    ${datos.retiros.length} retiros`);
  console.log(`    ${datos.transferencias.length} dias con Transferencia`);
  console.log(`    ${datos.cierres.length} cierres (${datos.resumen.diasPendientes} dias pendientes)`);
  console.log(`    ${datos.pedidos.length} pedidos en la nota`);
  console.log(`    ${NOMBRES_PROVEEDOR.length} proveedores`);
  console.log(
    `    Saldos finales: efectivo ${datos.resumen.saldoEfectivoFinal.toLocaleString("es-CO")} COP` +
      ` · Transferencia ${datos.resumen.saldoTransferenciaFinal.toLocaleString("es-CO")} COP`,
  );
  if (datos.resumen.diasTransferenciaNegativa > 0) {
    console.log(
      `    ⚠ ${datos.resumen.diasTransferenciaNegativa} dias con saldo de Transferencia negativo`,
    );
  }
  if (datos.diasConMuchosGastos.length > 0) {
    console.log(
      `    ${datos.diasConMuchosGastos.length} dias con 14+ gastos (para probar el acordeon):`,
    );
    console.log(`      ${datos.diasConMuchosGastos.slice(0, 5).join(", ")}`);
  }
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
