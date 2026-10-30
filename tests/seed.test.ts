import { describe, it, expect } from "vitest";
import {
  hostDe,
  esHostLocal,
  puedeEscribir,
  generarDatos,
  crearRng,
} from "../prisma/seed-data";

describe("seed - hostDe", () => {
  it("extrae el host de una URL de postgres", () => {
    expect(
      hostDe("postgresql://user:pass@localhost:5432/minimarket?schema=public"),
    ).toBe("localhost");
    expect(
      hostDe(
        "postgresql://u:p@ep-sweet-cake-b79j1pb4-pooler.c-13.us-east-1.aws.neon.tech/neondb?sslmode=require",
      ),
    ).toBe("ep-sweet-cake-b79j1pb4-pooler.c-13.us-east-1.aws.neon.tech");
  });

  it("devuelve cadena vacia si la URL no se puede parsear", () => {
    expect(hostDe("no-es-una-url")).toBe("");
  });
});

describe("seed - esHostLocal", () => {
  it("reconoce los hosts locales", () => {
    expect(esHostLocal("localhost")).toBe(true);
    expect(esHostLocal("127.0.0.1")).toBe(true);
  });

  it("rechaza cualquier host remoto", () => {
    expect(esHostLocal("ep-sweet-cake-b79j1pb4-pooler.c-13.us-east-1.aws.neon.tech")).toBe(false);
    expect(esHostLocal("db.ejemplo.com")).toBe(false);
  });
});

describe("seed - puedeEscribir", () => {
  const remoto = "db.ejemplo.com";

  it("permite siempre escribir en una base local", () => {
    expect(puedeEscribir("localhost", {}).permitido).toBe(true);
    expect(puedeEscribir("127.0.0.1", { forzar: false }).permitido).toBe(true);
  });

  it("niega una base remota sin banderas", () => {
    const r = puedeEscribir(remoto, {});
    expect(r.permitido).toBe(false);
    expect(r.motivo).toContain(remoto);
  });

  it("niega una base remota con solo --forzar", () => {
    // Una sola señal no basta: --forzar se puede pulsar por error.
    const r = puedeEscribir(remoto, { forzar: true, confirmar: null });
    expect(r.permitido).toBe(false);
    expect(r.motivo).toContain("--confirmar-produccion");
  });

  it("niega si la confirmacion no coincide con el host", () => {
    const r = puedeEscribir(remoto, {
      forzar: true,
      confirmar: "otro-host",
    });
    expect(r.permitido).toBe(false);
  });

  it("permite una base remota con las dos señales correctas", () => {
    const r = puedeEscribir(remoto, {
      forzar: true,
      confirmar: remoto,
    });
    expect(r.permitido).toBe(true);
  });
});

describe("seed - crearRng", () => {
  it("es determinista con la misma semilla", () => {
    const a = crearRng(42);
    const b = crearRng(42);
    const valoresA = [a.next(), a.next(), a.next()];
    const valoresB = [b.next(), b.next(), b.next()];
    expect(valoresA).toEqual(valoresB);
  });

  it("produce secuencias distintas con semillas distintas", () => {
    const a = crearRng(1);
    const b = crearRng(2);
    expect(a.next()).not.toBe(b.next());
  });
});

describe("seed - generarDatos", () => {
  const datos = generarDatos({ meses: 3, semilla: 7 });

  it("genera datos deterministas", () => {
    const otro = generarDatos({ meses: 3, semilla: 7 });
    expect(otro.gastos.length).toBe(datos.gastos.length);
    expect(otro.gastos[0]).toEqual(datos.gastos[0]);
    expect(otro.cierres[0]).toEqual(datos.cierres[0]);
  });

  it("cambia los datos con otra semilla", () => {
    const otro = generarDatos({ meses: 3, semilla: 8 });
    expect(otro.gastos.length).not.toBe(datos.gastos.length);
  });

  it("genera gastos con los tres tipos de pago", () => {
    const pagos = new Set(datos.gastos.map((g) => g.pagadoCon));
    expect(pagos).toContain("CAJA");
    expect(pagos).toContain("EFECTIVO");
    expect(pagos).toContain("TRANSFERENCIA");
  });

  it("genera retiros con varios tipos", () => {
    const tipos = new Set(datos.retiros.map((r) => r.tipo));
    expect(tipos.size).toBeGreaterThan(2);
  });

  it("incluye dias con muchos gastos para probar el acordeon", () => {
    expect(datos.diasConMuchosGastos.length).toBeGreaterThan(0);
  });

  it("deja algunos dias sin cierre (pendientes)", () => {
    expect(datos.resumen.diasPendientes).toBeGreaterThan(0);
  });

  it("usa valores positivos en todos los importes", () => {
    for (const g of datos.gastos) expect(g.valor).toBeGreaterThan(0);
    for (const r of datos.retiros) expect(r.valor).toBeGreaterThan(0);
    for (const c of datos.cierres) expect(c.efectivoGuardado).toBeGreaterThan(0);
  });

  it("no genera una fecha de gasto fuera del rango pedido", () => {
    const fin = new Date("2026-03-31T00:00:00.000Z");
    const conFin = generarDatos({ meses: 2, semilla: 3, fechaFin: fin });
    for (const g of conFin.gastos) {
      expect(g.fecha.getTime()).toBeLessThanOrEqual(fin.getTime());
    }
  });
});
