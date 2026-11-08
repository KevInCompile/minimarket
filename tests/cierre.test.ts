import { describe, it, expect } from "vitest";
import {
  cajaAperturaPorDefecto,
  aperturasPorDefecto,
  cierreEstaCargado,
  ordenarPorFechaDescendente,
} from "../src/lib/cierre";

/**
 * Reglas del cierre diario:
 *
 *  - La caja de apertura de un cierre arranca con la caja de cierre del
 *    cierre anterior: la plata de la caja no se reinicia sola.
 *  - Ese valor es un DEFAULT editable: se propone en el editor, no se
 *    persiste solo (si se persistiera en una fila en blanco, el resumen
 *    del período mostraría una "entrada estimada" negativa).
 *  - El listado se muestra del más nuevo al más viejo (b-a) para no
 *    scrollear hasta el día que se acaba de crear.
 */

const dia = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/** Cierre con datos (ya lo llenó el usuario). */
const cargado = (iso: string, cajaCierre: number) => ({
  fecha: dia(iso),
  cajaApertura: 100000,
  cajaCierre,
  efectivoGuardado: 0,
  efectivoRealContado: null,
});

/** Cierre en blanco: recién creado, todavía sin datos. */
const enBlanco = (iso: string) => ({
  fecha: dia(iso),
  cajaApertura: 0,
  cajaCierre: 0,
  efectivoGuardado: 0,
  efectivoRealContado: null,
});

/** Cierre cargado con conteo físico, aunque la caja haya quedado en 0. */
const contadoEnCero = (iso: string) => ({
  fecha: dia(iso),
  cajaApertura: 0,
  cajaCierre: 0,
  efectivoGuardado: 0,
  efectivoRealContado: 0,
});

describe("cierreEstaCargado", () => {
  it("un cierre con datos está cargado", () => {
    expect(cierreEstaCargado(cargado("2026-09-27", 180000))).toBe(true);
  });

  it("un cierre recién creado (todo en cero) no está cargado", () => {
    expect(cierreEstaCargado(enBlanco("2026-09-27"))).toBe(false);
  });

  it("una apertura propuesta NO alcanza para considerarlo cargado", () => {
    expect(
      cierreEstaCargado({
        fecha: dia("2026-09-27"),
        cajaApertura: 180000,
        cajaCierre: 0,
        efectivoGuardado: 0,
        efectivoRealContado: null,
      }),
    ).toBe(false);
  });

  it("un conteo físico basta para considerarlo cargado", () => {
    expect(
      cierreEstaCargado({
        fecha: dia("2026-09-27"),
        cajaApertura: 0,
        cajaCierre: 0,
        efectivoGuardado: 0,
        efectivoRealContado: 0,
      }),
    ).toBe(true);
  });
});

describe("cajaAperturaPorDefecto", () => {
  it("toma la caja de cierre del cierre anterior más reciente", () => {
    expect(
      cajaAperturaPorDefecto(
        [cargado("2026-09-26", 120000), cargado("2026-09-27", 180000)],
        dia("2026-09-28"),
      ),
    ).toBe(180000);
  });

  it("ignora un cierre de la misma fecha", () => {
    expect(
      cajaAperturaPorDefecto(
        [cargado("2026-09-27", 180000), cargado("2026-09-28", 999000)],
        dia("2026-09-28"),
      ),
    ).toBe(180000);
  });

  it("ignora cierres posteriores a la fecha", () => {
    expect(
      cajaAperturaPorDefecto(
        [cargado("2026-09-27", 180000), cargado("2026-09-30", 999000)],
        dia("2026-09-28"),
      ),
    ).toBe(180000);
  });

  it("sin cierres previos arranca en 0", () => {
    expect(cajaAperturaPorDefecto([], dia("2026-09-28"))).toBe(0);
  });

  it("un cierre previo contado con caja 0 conserva el 0", () => {
    expect(
      cajaAperturaPorDefecto([contadoEnCero("2026-09-27")], dia("2026-09-28")),
    ).toBe(0);
  });

  it("un cierre en blanco no sirve de antecedente", () => {
    expect(
      cajaAperturaPorDefecto(
        [cargado("2026-09-26", 120000), enBlanco("2026-09-27")],
        dia("2026-09-28"),
      ),
    ).toBe(120000);
  });

  it("no le importa el orden en que llegan los cierres", () => {
    expect(
      cajaAperturaPorDefecto(
        [cargado("2026-09-27", 180000), cargado("2026-09-26", 120000)],
        dia("2026-09-28"),
      ),
    ).toBe(180000);
  });
});

describe("aperturasPorDefecto", () => {
  it("sugiere la caja de cierre del cierre anterior para los días sin cierre", () => {
    const resultado = aperturasPorDefecto({
      dias: [dia("2026-09-28"), dia("2026-09-29")],
      cierres: [cargado("2026-09-26", 120000), cargado("2026-09-27", 180000)],
    });
    expect(resultado["2026-09-28"]).toBe(180000);
    // El 29 no tiene cierre previo más reciente que el 27: arrastra el 180.000.
    expect(resultado["2026-09-29"]).toBe(180000);
  });

  it("no propone default para los días que ya tienen un cierre con datos", () => {
    const resultado = aperturasPorDefecto({
      dias: [dia("2026-09-27"), dia("2026-09-28")],
      cierres: [cargado("2026-09-27", 180000)],
    });
    expect(resultado["2026-09-27"]).toBeUndefined();
    expect(resultado["2026-09-28"]).toBe(180000);
  });

  it("propone default para un día con cierre en blanco (recién creado)", () => {
    const resultado = aperturasPorDefecto({
      dias: [dia("2026-09-28")],
      cierres: [cargado("2026-09-27", 180000), enBlanco("2026-09-28")],
    });
    expect(resultado["2026-09-28"]).toBe(180000);
  });

  it("un cierre en blanco no arrastra la caja al día siguiente", () => {
    const resultado = aperturasPorDefecto({
      dias: [dia("2026-09-29")],
      cierres: [
        cargado("2026-09-26", 120000),
        cargado("2026-09-27", 180000),
        enBlanco("2026-09-28"),
      ],
    });
    expect(resultado["2026-09-29"]).toBe(180000);
  });

  it("un día ya cerrado no recibe propuesta: usa su valor guardado", () => {
    const resultado = aperturasPorDefecto({
      dias: [dia("2026-09-27")],
      cierres: [cargado("2026-09-27", 180000)],
    });
    expect(resultado["2026-09-27"]).toBeUndefined();
  });

  it("sin cierres previos propone 0", () => {
    const resultado = aperturasPorDefecto({
      dias: [dia("2026-09-28")],
      cierres: [],
    });
    expect(resultado["2026-09-28"]).toBe(0);
  });

  it("usa el cierre anterior al período como antecedente", () => {
    const resultado = aperturasPorDefecto({
      dias: [dia("2026-09-01")],
      cierres: [cargado("2026-08-31", 95000)],
    });
    expect(resultado["2026-09-01"]).toBe(95000);
  });
});

describe("ordenarPorFechaDescendente", () => {
  it("ordena del más nuevo al más viejo", () => {
    const filas = [
      { fecha: dia("2026-09-26") },
      { fecha: dia("2026-09-28") },
      { fecha: dia("2026-09-27") },
    ];
    expect(
      ordenarPorFechaDescendente(filas).map((f) =>
        f.fecha.toISOString().slice(0, 10),
      ),
    ).toEqual(["2026-09-28", "2026-09-27", "2026-09-26"]);
  });

  it("no muta el arreglo original", () => {
    const filas = [{ fecha: dia("2026-09-26") }, { fecha: dia("2026-09-28") }];
    ordenarPorFechaDescendente(filas);
    expect(filas.map((f) => f.fecha.toISOString().slice(0, 10))).toEqual([
      "2026-09-26",
      "2026-09-28",
    ]);
  });

  it("con lista vacía devuelve lista vacía", () => {
    expect(ordenarPorFechaDescendente([])).toEqual([]);
  });
});
