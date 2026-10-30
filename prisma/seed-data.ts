/**
 * Generador de datos de prueba para minimarket.
 *
 * Todo es determinista: con la misma semilla y el mismo rango de fechas
 * produce exactamente los mismos datos. Asi el seed se puede correr
 * cuantas veces sea sin que los numeros cambien, y las capturas de
 * pantalla y los tests siguen siendo reproducibles.
 *
 * Este modulo NO toca la base de datos: solo arma los registros. El
 * `seed.ts` se encarga de resolver ids y escribir.
 */
import type { PagadoCon, SaleDe, TipoRetiro } from "@prisma/client";

/* ────────────────────────── Aleatoriedad determinista ────────────────────────── */

/**
 * PRNG mulberry32: rapido, sin dependencias y con buena distribucion
 * para generar datos de prueba.
 */
export function mulberry32(semilla: number): () => number {
  let a = semilla >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = {
  /** Flotante en [0, 1). */
  next: () => number;
  /** Entero en [min, max] inclusive. */
  int: (min: number, max: number) => number;
  /** Elemento aleatorio de una lista no vacia. */
  pick: <T>(items: readonly T[]) => T;
  /** true con la probabilidad dada (0..1). */
  chance: (p: number) => boolean;
  /** Numero redondeado a multiplos de `paso`. */
  multiplo: (min: number, max: number, paso: number) => number;
};

export function crearRng(semilla: number): Rng {
  const next = mulberry32(semilla);
  const int = (min: number, max: number) =>
    min + Math.floor(next() * (max - min + 1));
  return {
    next,
    int,
    pick: <T,>(items: readonly T[]): T => items[int(0, items.length - 1)]!,
    chance: (p: number) => next() < p,
    multiplo: (min: number, max: number, paso: number) =>
      Math.round((min + next() * (max - min)) / paso) * paso,
  };
}

/* ────────────────────────── Guardas de seguridad ────────────────────────── */

const HOSTS_LOCALES = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", ""]);

/**
 * Extrae el host de una DATABASE_URL. Devuelve "" si la URL no se puede
 * parsear, y en ese caso se trata como no local.
 */
export function hostDe(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/** true si el host corresponde a una base de datos local. */
export function esHostLocal(host: string): boolean {
  return HOSTS_LOCALES.has(host);
}

/**
 * Decide si el seed puede escribir en la base de datos.
 *
 * En una base local siempre se puede. En una remota hacen falta DOS
 * señales independientes: la bandera `--forzar` y confirmar a mano el
 * host con `--confirmar-produccion=<host>`. Con una sola de las dos no
 * se escribe nada, porque la base de produccion tiene datos reales y
 * este seed los borra.
 */
export function puedeEscribir(
  host: string,
  opciones: { forzar?: boolean; confirmar?: string | null },
): { permitido: boolean; motivo?: string } {
  if (esHostLocal(host)) return { permitido: true };

  if (!opciones.forzar) {
    return {
      permitido: false,
      motivo:
        `La base de datos ${host} no es local y sus datos son reales. ` +
        `Para escribir igual hace falta --forzar y --confirmar-produccion=${host}.`,
    };
  }

  if (opciones.confirmar !== host) {
    return {
      permitido: false,
      motivo:
        `Falta la confirmacion explicita. Vuelve a correr con ` +
        `--confirmar-produccion=${host} si de verdad querés sobrescribir ` +
        `los datos de esa base.`,
    };
  }

  return { permitido: true };
}

/* ────────────────────────── Catalogo de productos ────────────────────────── */

type EntradaCatalogo = {
  proveedor: string;
  productos: string[];
};

/** Distribuidores y marcas tipicos de un minimarket colombiano. */
export const CATALOGO: EntradaCatalogo[] = [
  { proveedor: "Coca-Cola", productos: ["Gaseosa 1.5 L", "Gaseosa 2 L", "Coca-Cola personal 190 ml", "Agua Tonic 1.5 L"] },
  { proveedor: "Postobón", productos: ["Gaseosa 1.5 L", "Jugo Hit 1 L", "Agua 600 ml", "Soda Limón 1.5 L"] },
  { proveedor: "Quala", productos: ["Gaseosa 1.5 L", "Gaseosa 2.5 L", "Agua 600 ml"] },
  { proveedor: "Altipal", productos: ["Pan tajado", "Galletas de avena", "Tostadas", "Panela 500 g"] },
  { proveedor: "Colanta", productos: ["Leche 1 L", "Queso Cromwell", "Mantequilla 250 g", "Bebida lactea 1 L"] },
  { proveedor: "Zenú", productos: ["Galletas", "Chocolates", "Panela 500 g", "Azucar 1 kg"] },
  { proveedor: "Juan Valdez", productos: ["Cafe molido 250 g", "Cafe instantaneo"] },
  { proveedor: "Donde Waldo", productos: ["Chocolates", "Bombones", "Chupetas"] },
  { proveedor: "Ybarra", productos: ["Galletas", "Panela 500 g", "Obleas"] },
  { proveedor: "Nestle", productos: ["Leche Nido 900 g", "Chocolate", "Nesquik 300 g"] },
  { proveedor: "Mondelez", productos: ["Chocolate", "Galletas Chips Ah", "Chewy"] },
  { proveedor: "Alpina", productos: ["Mantequilla 250 g", "Crema de leche", "Queso crema"] },
  { proveedor: "Bocadillos La Catedral", productos: ["Bocadillos", "Galletas", "Chocolates"] },
  { proveedor: "RamO", productos: ["Chocolates", "Confiteria", "Chupetas"] },
  { proveedor: "La Sabana", productos: ["Panela 500 g", "Azucar 1 kg", "Arroz 500 g"] },
  { proveedor: "Team Ice", productos: ["Helados", "Concentrado de threw"] },
  { proveedor: "Ap Readings", productos: ["Leche deslactosada 1 L", "Huevos AA", "Mantequilla"] },
  { proveedor: "Distribuidora El Paraiso", productos: ["Arroz 500 g", "Fideos", "Aceite 1 L"] },
  { proveedor: "Frutas del Valle", productos: ["Manzana", "Banano", "Naranja", "Tomate"] },
  { proveedor: "Panaderia La Espiga", productos: ["Pan blanco", "PanIntegral", "Pañales"] },
  { proveedor: "Comfrio", productos: ["Helados", "Pizzas congeladas"] },
  { proveedor: "Surtimax", productos: ["Cloro", "Jabon en polvo", "Papel higienico", "Bolsa de basura"] },
  { proveedor: "Inversiones LD", productos: ["Caramelos", "Chicles", "Galletas"] },
  { proveedor: "La Polar", productos: ["Cerveza", "Gaseosas"] },
  { proveedor: "Obleque", productos: ["Obleas", "Wafer"] },
  { proveedor: "Tomas/enchufe", productos: ["Bombillos LED", "Cables", "Tomas", "Pilas"] },
  { proveedor: "Espatula", productos: ["Utensilios de cocina", "Bolillos", "Esponjas"] },
  { proveedor: "Genericos SA", productos: ["Detergente", "Cloro", "Jabon liquido"] },
  { proveedor: "Central de Abastos", productos: ["Papa", "Yuca", "Platano", "Cebolla"] },
];

export const NOMBRES_PROVEEDOR = CATALOGO.map((c) => c.proveedor);

/* ────────────────────────── Catalogo de retiros ────────────────────────── */

export type PlantillaRetiro = {
  tipo: TipoRetiro;
  concepto: string;
  saleDe: SaleDe;
  /** Rango tipico de valor en COP. */
  min: number;
  max: number;
  /** Cada cuantos dias aparece, en promedio. 1 = todos los dias. */
  frecuencia: number;
};

export const PLANTILLAS_RETIRO: PlantillaRetiro[] = [
  { tipo: "ARRIENDO", concepto: "Arriendo del local", saleDe: "TRANSFERENCIA", min: 1_200_000, max: 2_400_000, frecuencia: 30 },
  { tipo: "SERVICIOS", concepto: "Servicios (luz, agua, internet)", saleDe: "TRANSFERENCIA", min: 180_000, max: 520_000, frecuencia: 12 },
  { tipo: "SERVICIOS", concepto: "Celular de la tienda", saleDe: "EFECTIVO", min: 45_000, max: 90_000, frecuencia: 30 },
  { tipo: "NOMINA", concepto: "Nomina auxiliar de tienda", saleDe: "EFECTIVO", max: 780_000, min: 580_000, frecuencia: 30 },
  { tipo: "IMPUESTOS", concepto: "Impuesto a las ventas", saleDe: "TRANSFERENCIA", min: 120_000, max: 380_000, frecuencia: 30 },
  { tipo: "PRESTAMO", concepto: "Prestamo del proveedor", saleDe: "CAJA", min: 300_000, max: 900_000, frecuencia: 45 },
  { tipo: "RETIRO_PERSONAL", concepto: "Retiro personal del dueno", saleDe: "EFECTIVO", min: 100_000, max: 500_000, frecuencia: 14 },
  { tipo: "OTRO", concepto: "Pagos menores varios", saleDe: "CAJA", min: 15_000, max: 90_000, frecuencia: 6 },
];

/* ────────────────────────── Tipos de datos de salida ────────────────────────── */

export type GastoSeed = {
  fecha: Date;
  proveedor: string;
  producto: string;
  valor: number;
  pagadoCon: PagadoCon;
  nota: string | null;
  /** Indice de la persona que lo registro. */
  usuario: number;
};

export type RetiroSeed = {
  fecha: Date;
  tipo: TipoRetiro;
  concepto: string;
  valor: number;
  saleDe: SaleDe;
  nota: string | null;
  usuario: number;
};

export type TransferenciaSeed = {
  fecha: Date;
  total: number;
  usuario: number;
};

export type CierreSeed = {
  fecha: Date;
  cajaApertura: number;
  cajaCierre: number;
  efectivoGuardado: number;
  efectivoRealContado: number | null;
  usuario: number;
};

export type PedidoSeed = {
  proveedor: string;
  valor: number;
  dia: string;
  estado: string | null;
  nota: string | null;
};

export type DatosSeed = {
  gastos: GastoSeed[];
  retiros: RetiroSeed[];
  transferencias: TransferenciaSeed[];
  cierres: CierreSeed[];
  pedidos: PedidoSeed[];
  /** Fechas con mas gastos a proposito, para probar el acordeon. */
  diasConMuchosGastos: string[];
  resumen: {
    dias: number;
    diasConCierre: number;
    diasPendientes: number;
    /** Saldo final simulado de la Transferencia. */
    saldoTransferenciaFinal: number;
    /** Saldo final simulado del efectivo guardado. */
    saldoEfectivoFinal: number;
    /** Dias en que el saldo de Transferencia quedo negativo. */
    diasTransferenciaNegativa: number;
  };
};

export type OpcionesSeed = {
  /** Cuantos meses hacia atras se generan. */
  meses?: number;
  /** Semilla del PRNG. */
  semilla?: number;
  /** Ultimo dia generado (inclusive). Por defecto hoy. */
  fechaFin?: Date;
};

/* ────────────────────────── Utilidades de fecha (UTC) ────────────────────────── */

const DIA_MS = 86_400_000;

function utcDia(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function sumarDias(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DIA_MS);
}

function clave(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/* ────────────────────────── Generador ────────────────────────── */

/**
 * Genera el juego completo de datos.
 *
 * La simulacion de caja y efectivo guardado replica la logica de
 * `src/lib/calc.ts` para que los numeros del seed sean coherentes con lo
 * que la app calcula: si el conteo real coincide con el acumulado, el
 * descuadre sale en cero, igual que en una tienda real que cuadra.
 */
export function generarDatos(opciones: OpcionesSeed = {}): DatosSeed {
  const meses = opciones.meses ?? 12;
  const semilla = opciones.semilla ?? 20261015;
  const rng = crearRng(semilla);

  const fin = utcDia(opciones.fechaFin ?? new Date());
  const inicio = new Date(
    Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth() - (meses - 1), 1),
  );

  const gastos: GastoSeed[] = [];
  const retiros: RetiroSeed[] = [];
  const transferencias: TransferenciaSeed[] = [];
  const cierres: CierreSeed[] = [];
  const diasConMuchosGastos: string[] = [];

  // Acumulados que se simulan en paralelo a `calc.ts`.
  let efectivoAcumulado = 0;
  let transferenciaAcumulado = 0;
  // Dias en que el saldo de Transferencia quedo negativo. No es lo ideal
  // (una tienda real no gasta mas de lo que tiene), pero sirve como
  // aviso de que la tanda generada no es del todo coherente.
  let diasTransferenciaNegativa = 0;

  const totalDias =
    Math.round((fin.getTime() - inicio.getTime()) / DIA_MS) + 1;

  for (let i = 0; i < totalDias; i++) {
    const fecha = sumarDias(inicio, i);
    const diaSemana = fecha.getUTCDay(); // 0 domingo
    const esDomingo = diaSemana === 0;

    /* Gastos ------------------------------------------------------------ */
    // Reparto realista: mas carga en lunes (restock) y sabado, menos
    // los domingos. Un dia al mes se dispara para probar el acordeon.
    let cantidadGastos = esDomingo ? rng.int(0, 2) : rng.int(2, 9);
    if (diaSemana === 1 || diaSemana === 6) cantidadGastos += rng.int(1, 4);
    if (rng.chance(0.04)) cantidadGastos = rng.int(14, 24);

    const esDiaLlave = cantidadGastos >= 14;
    if (esDiaLlave) diasConMuchosGastos.push(clave(fecha));

    let gastadoCaja = 0;
    let gastadoEfectivo = 0;
    let gastadoTransferencia = 0;

    for (let g = 0; g < cantidadGastos; g++) {
      const entrada = rng.pick(CATALOGO);
      const producto = rng.pick(entrada.productos);
      // Valor logico: los productos grandes cuestan mas que los pequenos.
      const valor = rng.multiplo(4_000, 220_000, 500);

      // La forma de pago depende de la magnitud: lo grande casi siempre
      // se paga por transferencia o efectivo guardado. En una tienda real
      // casi todo sale de la caja del dia, y la transferencia queda para
      // las compras grandes y poco frecuentes.
      const pago: PagadoCon = rng.chance(0.5)
        ? "CAJA"
        : rng.chance(0.73)
          ? "EFECTIVO"
          : "TRANSFERENCIA";

      if (pago === "CAJA") gastadoCaja += valor;
      else if (pago === "EFECTIVO") gastadoEfectivo += valor;
      else gastadoTransferencia += valor;

      gastos.push({
        fecha,
        proveedor: entrada.proveedor,
        producto,
        valor,
        pagadoCon: pago,
        nota: rng.chance(0.22) ? `${producto} - pedido #${rng.int(1000, 9999)}` : null,
        usuario: rng.chance(0.75) ? 0 : 1,
      });
    }

    /* Retiros ----------------------------------------------------------- */
    let retiradoEfectivo = 0;
    let retiradoTransferencia = 0;
    let retiradoCaja = 0;

    for (const plantilla of PLANTILLAS_RETIRO) {
      const prob = 1 / plantilla.frecuencia;
      if (!rng.chance(prob)) continue;

      // No se repite el mismo tipo mas de una vez al dia.
      if (
        retiros.some(
          (r) => r.fecha.getTime() === fecha.getTime() && r.tipo === plantilla.tipo,
        )
      ) {
        continue;
      }

      const valor = rng.multiplo(plantilla.min, plantilla.max, 500);
      if (plantilla.saleDe === "EFECTIVO") retiradoEfectivo += valor;
      else if (plantilla.saleDe === "TRANSFERENCIA") retiradoTransferencia += valor;
      else retiradoCaja += valor;

      retiros.push({
        fecha,
        tipo: plantilla.tipo,
        concepto: plantilla.concepto,
        valor,
        saleDe: plantilla.saleDe,
        nota: rng.chance(0.3) ? "Recibo en caja" : null,
        usuario: 0,
      });
    }

    /* Transferencia recibida -------------------------------------------- */
    const recibeTransferencia = !esDomingo && rng.chance(0.72);
    const totalTransferencia = recibeTransferencia
      ? rng.multiplo(120_000, 1_100_000, 5_000)
      : 0;
    if (recibeTransferencia) {
      transferencias.push({
        fecha,
        total: totalTransferencia,
        usuario: rng.chance(0.6) ? 0 : 1,
      });
    }

    /* Cierre diario ------------------------------------------------------ */
    // Faltan algunos cierres a proposito: son los dias que la app
    // muestra como "pendientes".
    const hayCierre = !esDomingo && rng.chance(0.88);

    let ventasEfectivo = 0;
    if (hayCierre) {
      ventasEfectivo = rng.multiplo(180_000, 850_000, 5_000);
      const cajaApertura = rng.multiplo(150_000, 500_000, 5_000);
      const cajaCierre = Math.max(
        0,
        cajaApertura + ventasEfectivo - gastadoCaja - retiradoCaja,
      );

      // El conteo real coincide con el acumulado salvo en un par de
      // dias, para que se vea el caso del descuadre.
      const conDescuadre = rng.chance(0.07);
      const desvio = conDescuadre ? rng.multiplo(3_000, 28_000, 500) : 0;
      const conConteo = rng.chance(0.85);

      cierres.push({
        fecha,
        cajaApertura,
        cajaCierre,
        efectivoGuardado: ventasEfectivo,
        efectivoRealContado: conConteo ? efectivoAcumulado + desvio : null,
        usuario: 0,
      });
    }

    // Los acumulados se mueven TODOS los dias, cierre o no, igual que en
    // `calc.ts`: el efectivo guardado solo entra si hubo cierre (si no,
    // vale 0), pero la Transferencia recibida es un movimiento del dia y
    // suma siempre.
    efectivoAcumulado += ventasEfectivo - gastadoEfectivo - retiradoEfectivo;
    transferenciaAcumulado +=
      totalTransferencia - gastadoTransferencia - retiradoTransferencia;

    if (transferenciaAcumulado < 0) diasTransferenciaNegativa += 1;
  }

  /* Pedidos (nota) ------------------------------------------------------ */
  const pedidos: PedidoSeed[] = [];
  const estados = ["Pendiente", "Pedido", "Recibido", "Cancelado", null];
  for (let i = 0; i < 18; i++) {
    const entrada = rng.pick(CATALOGO);
    const f = sumarDias(fin, -rng.int(0, 40));
    pedidos.push({      proveedor: entrada.proveedor,
      valor: rng.multiplo(80_000, 1_800_000, 5_000),
      dia: `${String(f.getUTCDate()).padStart(2, "0")}/${String(f.getUTCMonth() + 1).padStart(2, "0")}`,
      estado: rng.pick(estados),
      nota: rng.chance(0.3) ? "Pedido del Thursday" : null,
    });
  }

  const diasConCierre = cierres.length;

  return {
    gastos,
    retiros,
    transferencias,
    cierres,
    pedidos,
    diasConMuchosGastos,
    resumen: {
      dias: totalDias,
      diasConCierre,
      diasPendientes: totalDias - diasConCierre,
      saldoTransferenciaFinal: transferenciaAcumulado,
      saldoEfectivoFinal: efectivoAcumulado,
      diasTransferenciaNegativa: diasTransferenciaNegativa,
    },
  };
}
