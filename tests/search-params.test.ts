import { describe, it, expect } from "vitest";
import {
  parseMesLabel,
  mesRange,
  mesKey,
  toISODateLocal,
  mesAnterior,
  mesSiguiente,
  mesActual,
  normalizarDiaCorte,
  periodoKeyDe,
  etiquetaPeriodo,
} from "../src/lib/dates";
import {
  parseFiltrosComunes,
  filtrosToQuery,
  fechaPorDefectoPara,
  navegacionMes,
  periodoComparacion,
} from "../src/lib/search-params";
import {
  debeNavegar,
  mesDeFecha,
  periodoContiene,
  urlDelPeriodo,
} from "../src/components/filtros/ir-al-periodo";

describe("dates - toISODateLocal", () => {
  // El constructor local de Date garantiza que la hora sea local sin
  // importar la zona horaria donde corra el test.
  it("devuelve la fecha del reloj del usuario, no la de UTC", () => {
    // 22 de octubre, 23:30 hora local. En UTC-5 ya es el 23, que es
    // exactamente el bug que reporto el usuario.
    expect(toISODateLocal(new Date(2026, 9, 22, 23, 30))).toBe("2026-10-22");
    // Madrugada: tampoco debe adelantarse.
    expect(toISODateLocal(new Date(2026, 9, 22, 0, 30))).toBe("2026-10-22");
  });

  it("no cambia de dia dentro de la misma fecha local", () => {
    for (const hora of [0, 6, 12, 18, 23]) {
      expect(toISODateLocal(new Date(2026, 9, 22, hora, 0))).toBe("2026-10-22");
    }
  });

  it("formatea meses y dias con dos digitos", () => {
    expect(toISODateLocal(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toISODateLocal(new Date(2026, 11, 31))).toBe("2026-12-31");
  });

  it("cruza el cambio de dia correctamente", () => {
    expect(toISODateLocal(new Date(2026, 9, 31, 23, 59))).toBe("2026-10-31");
    expect(toISODateLocal(new Date(2026, 10, 1, 0, 1))).toBe("2026-11-01");
  });
});

describe("dates - parseMesLabel", () => {
  it("devuelve el label legible en español", () => {
    expect(parseMesLabel("2026-09")).toBe("Septiembre 2026");
    expect(parseMesLabel("2026-01")).toBe("Enero 2026");
    expect(parseMesLabel("2026-12")).toBe("Diciembre 2026");
  });

  it("devuelve null si la clave es inválida", () => {
    expect(parseMesLabel("2026-13")).toBeNull();
    expect(parseMesLabel("2026-00")).toBeNull();
    expect(parseMesLabel("2026-9")).toBeNull();
    expect(parseMesLabel("foo")).toBeNull();
    expect(parseMesLabel("")).toBeNull();
  });
});

describe("dates - mesRange", () => {
  it("febrero de año no bisiesto tiene 28 días", () => {
    const r = mesRange("2026-02");
    expect(r).not.toBeNull();
    expect(r!.desde.toISOString().slice(0, 10)).toBe("2026-02-01");
    expect(r!.hasta.toISOString()).toBe("2026-02-28T23:59:59.999Z");
  });

  it("febrero de año bisiesto tiene 29 días", () => {
    const r = mesRange("2024-02");
    expect(r).not.toBeNull();
    // 2024 es bisiesto → 2024-02-29
    expect(r!.hasta.toISOString().slice(0, 10)).toBe("2024-02-29");
  });

  it("diciembre cierra el año", () => {
    const r = mesRange("2026-12");
    expect(r).not.toBeNull();
    expect(r!.desde.toISOString().slice(0, 10)).toBe("2026-12-01");
    expect(r!.hasta.toISOString().slice(0, 10)).toBe("2026-12-31");
  });

  it("devuelve null si la clave es inválida", () => {
    expect(mesRange("2026-13")).toBeNull();
    expect(mesRange("2026-00")).toBeNull();
    expect(mesRange("2026-1")).toBeNull();
  });
});

describe("dates - mesKey", () => {
  it("devuelve la clave YYYY-MM de una fecha UTC", () => {
    expect(mesKey(new Date("2026-09-15T00:00:00.000Z"))).toBe("2026-09");
    expect(mesKey(new Date("2026-01-01T00:00:00.000Z"))).toBe("2026-01");
  });
});

describe("parseFiltrosComunes", () => {
  it("usa `mes` como atajo cuando está presente y es válido", async () => {
    const out = await parseFiltrosComunes(
      Promise.resolve({ mes: "2026-09" }),
    );
    expect(out.mes).toBe("2026-09");
    expect(out.desde.toISOString().slice(0, 10)).toBe("2026-09-01");
    expect(out.hasta.toISOString().slice(0, 10)).toBe("2026-09-30");
  });

  it("ignora `mes` si es inválido y usa rango manual si está", async () => {
    const out = await parseFiltrosComunes(
      Promise.resolve({
        mes: "foo",
        desde: "2026-09-01",
        hasta: "2026-09-30",
      }),
    );
    expect(out.mes).toBeNull();
    expect(out.desde.toISOString().slice(0, 10)).toBe("2026-09-01");
    expect(out.hasta.toISOString().slice(0, 10)).toBe("2026-09-30");
  });

  it("usa desde/hasta cuando hay un rango manual válido", async () => {
    const out = await parseFiltrosComunes(
      Promise.resolve({ desde: "2026-09-15", hasta: "2026-09-20" }),
    );
    expect(out.mes).toBeNull();
    // desde = inicio del día 15, hasta = fin del día 20
    expect(out.desde.toISOString().slice(11)).toBe("00:00:00.000Z");
    expect(out.hasta.toISOString().slice(11)).toBe("23:59:59.999Z");
    expect(out.desde.toISOString().slice(0, 10)).toBe("2026-09-15");
    expect(out.hasta.toISOString().slice(0, 10)).toBe("2026-09-20");
  });

  it("cae a defaults cuando no hay params", async () => {
    const out = await parseFiltrosComunes(Promise.resolve({}));
    expect(out.desde.toISOString().slice(11)).toBe("00:00:00.000Z");
    expect(out.hasta.toISOString().slice(11)).toBe("23:59:59.999Z");
    // El default es el mes actual UTC, así que la mes key coincide con el mes actual.
    expect(out.mes).toBe(mesKey(out.desde));
  });

  it("respeta los defaults personalizados", async () => {
    const out = await parseFiltrosComunes(
      Promise.resolve({}),
      {
        desde: new Date("2026-01-01T00:00:00.000Z"),
        hasta: new Date("2026-12-31T23:59:59.999Z"),
      },
    );
    expect(out.desde.toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(out.hasta.toISOString().slice(0, 10)).toBe("2026-12-31");
  });

  it("acepta arrays y toma el primer elemento", async () => {
    const out = await parseFiltrosComunes(
      Promise.resolve({ mes: ["2026-09", "2026-10"] }),
    );
    expect(out.mes).toBe("2026-09");
  });
});

describe("filtrosToQuery", () => {
  it("serializa `mes` cuando está presente", () => {
    expect(
      filtrosToQuery({ mes: "2026-09" }),
    ).toBe("?mes=2026-09");
  });

  it("serializa desde/hasta cuando no hay mes", () => {
    expect(
      filtrosToQuery({
        desde: new Date("2026-09-01T00:00:00.000Z"),
        hasta: new Date("2026-09-30T00:00:00.000Z"),
      }),
    ).toBe("?desde=2026-09-01&hasta=2026-09-30");
  });

  it("omite valores nulos y vacíos", () => {
    expect(filtrosToQuery({})).toBe("");
    expect(filtrosToQuery({ mes: null })).toBe("");
  });
});

describe("dates - mesAnterior / mesSiguiente", () => {
  it("devuelve el mes vecino dentro del mismo año", () => {
    expect(mesAnterior("2026-10")).toBe("2026-09");
    expect(mesSiguiente("2026-10")).toBe("2026-11");
  });

  it("cruza el cambio de año en enero y diciembre", () => {
    expect(mesAnterior("2026-01")).toBe("2025-12");
    expect(mesSiguiente("2026-12")).toBe("2027-01");
  });

  it("devuelve null si la clave es inválida", () => {
    expect(mesAnterior("2026-13")).toBeNull();
    expect(mesAnterior("2026-00")).toBeNull();
    expect(mesAnterior("2026-1")).toBeNull();
    expect(mesAnterior("foo")).toBeNull();
    expect(mesAnterior("")).toBeNull();
    expect(mesSiguiente("2026-13")).toBeNull();
    expect(mesSiguiente("2026-00")).toBeNull();
    expect(mesSiguiente("2026-9")).toBeNull();
    expect(mesSiguiente("foo")).toBeNull();
    expect(mesSiguiente("")).toBeNull();
  });
});

describe("dates - mesActual", () => {
  it("devuelve el mes del reloj del usuario, no el de UTC", () => {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, "0");
    expect(mesActual()).toBe(`${y}-${m}`);
  });
});

describe("navegacionMes", () => {
  it("con un mes pasado devuelve los dos vecinos", () => {
    const nav = navegacionMes("2020-05", new Date("2020-05-20T00:00:00.000Z"));
    expect(nav.anterior).toBe("2020-04");
    expect(nav.siguiente).toBe("2020-06");
  });

  it("en el mes actual la flecha derecha queda apagada", () => {
    const nav = navegacionMes(mesActual(), new Date());
    expect(nav.siguiente).toBeNull();
    expect(nav.anterior).toBe(mesAnterior(mesActual()));
  });

  it("nunca deja navegar a un mes futuro", () => {
    const nav = navegacionMes("2099-01", new Date());
    expect(nav.siguiente).toBeNull();
    // La flecha izquierda sí funciona: el mes anterior existe.
    expect(nav.anterior).toBe("2098-12");
  });

  it("sin `mes` usa el mes en que termina el rango", () => {
    const nav = navegacionMes(null, new Date("2020-05-20T23:59:59.999Z"));
    expect(nav.anterior).toBe("2020-04");
    expect(nav.siguiente).toBe("2020-06");
  });
});

describe("periodoComparacion", () => {
  it("con `mes` compara contra el mes calendario anterior completo", () => {
    const out = periodoComparacion(
      "2026-10",
      new Date("2026-10-01T00:00:00.000Z"),
      new Date("2026-10-31T23:59:59.999Z"),
    );
    expect(out.esMes).toBe(true);
    // Septiembre entero, no "los 31 días previos" (que sería ago 31 - sep 30).
    expect(out.desde.toISOString().slice(0, 10)).toBe("2026-09-01");
    expect(out.hasta.toISOString()).toBe("2026-09-30T23:59:59.999Z");
  });

  it("cruza el cambio de año: enero se compara contra diciembre", () => {
    const out = periodoComparacion(
      "2026-01",
      new Date("2026-01-01T00:00:00.000Z"),
      new Date("2026-01-31T23:59:59.999Z"),
    );
    expect(out.esMes).toBe(true);
    expect(out.desde.toISOString().slice(0, 10)).toBe("2025-12-01");
    expect(out.hasta.toISOString()).toBe("2025-12-31T23:59:59.999Z");
  });

  it("sin `mes` compara contra el rango anterior del mismo largo", () => {
    const out = periodoComparacion(
      null,
      new Date("2026-10-01T00:00:00.000Z"),
      new Date("2026-10-31T23:59:59.999Z"),
    );
    expect(out.esMes).toBe(false);
    // 31 días: la ventana anterior es del 31 de agosto al 30 de septiembre.
    expect(out.desde.toISOString().slice(0, 10)).toBe("2026-08-31");
    expect(out.hasta.toISOString().slice(0, 10)).toBe("2026-09-30");
  });

  it("el mes anterior no es la ventana del mismo largo", () => {
    // Febrero de 2026 tiene 28 días: la ventana del mismo largo sería del 3
    // al 30 de enero, pero el mes calendario anterior es enero entero.
    const out = periodoComparacion(
      "2026-02",
      new Date("2026-02-01T00:00:00.000Z"),
      new Date("2026-02-28T23:59:59.999Z"),
    );
    expect(out.esMes).toBe(true);
    expect(out.desde.toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(out.hasta.toISOString()).toBe("2026-01-31T23:59:59.999Z");
  });

  it("con una clave de mes inválida cae al rango anterior", () => {
    const out = periodoComparacion(
      "foo",
      new Date("2026-10-01T00:00:00.000Z"),
      new Date("2026-10-05T23:59:59.999Z"),
    );
    expect(out.esMes).toBe(false);
    // 5 días: del 26 al 30 de septiembre.
    expect(out.desde.toISOString().slice(0, 10)).toBe("2026-09-26");
    expect(out.hasta.toISOString().slice(0, 10)).toBe("2026-09-30");
  });
});

describe("fechaPorDefectoPara", () => {
  it("en el mes actual devuelve hoy", () => {
    const ahora = new Date();
    expect(fechaPorDefectoPara(ahora)).toBe(toISODateLocal(ahora));
  });

  it("en un rango que terminó en el pasado devuelve ese día", () => {
    // Constructor local: el resultado no depende de la zona horaria.
    const finDeRango = new Date(2020, 4, 20, 12, 0, 0);
    expect(fechaPorDefectoPara(finDeRango)).toBe("2020-05-20");
  });

  it("nunca devuelve una fecha futura", () => {
    const futuro = new Date(2099, 0, 15, 12, 0, 0);
    const ahora = new Date();
    expect(fechaPorDefectoPara(futuro)).toBe(toISODateLocal(ahora));
  });
});

// ── Navegación al período del registro guardado ────────────────────────────
//
// La regla es pura: si la fecha guardada NO está en el período visible, se
// navega al mes que la contiene; si está, no se navega (el usuario sigue
// trabajando en la misma vista).
describe("ir-al-periodo - periodoContiene", () => {
  const desde = new Date("2026-10-01T00:00:00.000Z");
  const hasta = new Date("2026-10-31T23:59:59.999Z");

  it("devuelve true para una fecha dentro del rango", () => {
    expect(
      periodoContiene(new Date("2026-10-30T00:00:00.000Z"), desde, hasta),
    ).toBe(true);
  });

  it("devuelve false para una fecha fuera del rango", () => {
    expect(
      periodoContiene(new Date("2026-09-30T00:00:00.000Z"), desde, hasta),
    ).toBe(false);
    expect(
      periodoContiene(new Date("2026-11-01T00:00:00.000Z"), desde, hasta),
    ).toBe(false);
  });

  it("incluye los bordes del rango", () => {
    expect(periodoContiene(desde, desde, hasta)).toBe(true);
    expect(periodoContiene(hasta, desde, hasta)).toBe(true);
  });

  it("compara por día, no por instante: cualquier hora del último día entra", () => {
    expect(
      periodoContiene(new Date("2026-10-31T18:30:00.000Z"), desde, hasta),
    ).toBe(true);
  });
});

describe("ir-al-periodo - mesDeFecha", () => {
  it("devuelve la clave YYYY-MM en UTC", () => {
    expect(mesDeFecha(new Date("2026-10-30T00:00:00.000Z"))).toBe("2026-10");
    expect(mesDeFecha(new Date("2026-01-01T00:00:00.000Z"))).toBe("2026-01");
  });
});

describe("ir-al-periodo - debeNavegar", () => {
  const desde = new Date("2026-11-01T00:00:00.000Z");
  const hasta = new Date("2026-11-30T23:59:59.999Z");

  it("navega cuando la fecha guardada está fuera del período visible", () => {
    expect(
      debeNavegar(new Date("2026-10-30T00:00:00.000Z"), desde, hasta),
    ).toBe(true);
  });

  it("no navega cuando la fecha guardada ya está visible", () => {
    expect(
      debeNavegar(new Date("2026-11-05T00:00:00.000Z"), desde, hasta),
    ).toBe(false);
  });

  it("no navega si no se conoce el período visible", () => {
    expect(
      debeNavegar(new Date("2026-10-30T00:00:00.000Z"), undefined, undefined),
    ).toBe(false);
  });
});

describe("ir-al-periodo - urlDelPeriodo", () => {
  it("conserva los demás searchParams y quita el rango manual", () => {
    const url = urlDelPeriodo(
      "/gastos",
      "mes=2026-09&proveedores=abc&desde=2026-09-01&hasta=2026-09-30",
      new Date("2026-10-30T00:00:00.000Z"),
    );
    expect(url.startsWith("/gastos?")).toBe(true);
    expect(url).toContain("mes=2026-10");
    expect(url).toContain("proveedores=abc");
    expect(url).not.toContain("desde=");
    expect(url).not.toContain("hasta=");
  });

  it("funciona sin searchParams previos", () => {
    const url = urlDelPeriodo(
      "/cierre",
      "",
      new Date("2026-10-30T00:00:00.000Z"),
    );
    expect(url).toBe("/cierre?mes=2026-10");
  });
});

describe("periodos con dia de corte", () => {
  describe("normalizarDiaCorte", () => {
    it("deja los valores validos", () => {
      expect(normalizarDiaCorte(1)).toBe(1);
      expect(normalizarDiaCorte(15)).toBe(15);
      expect(normalizarDiaCorte(28)).toBe(28);
    });

    it("acota los valores fuera de rango", () => {
      expect(normalizarDiaCorte(0)).toBe(1);
      expect(normalizarDiaCorte(-5)).toBe(1);
      expect(normalizarDiaCorte(29)).toBe(28);
      expect(normalizarDiaCorte(31)).toBe(28);
      expect(normalizarDiaCorte(null)).toBe(1);
      expect(normalizarDiaCorte(undefined)).toBe(1);
      expect(normalizarDiaCorte(NaN)).toBe(1);
    });
  });

  describe("mesRange con dia de corte", () => {
    it("con corte 1 es el mes calendario", () => {
      const r = mesRange("2026-10", 1);
      expect(r!.desde.toISOString().slice(0, 10)).toBe("2026-10-01");
      expect(r!.hasta.toISOString().slice(0, 10)).toBe("2026-10-31");
    });

    it("con corte 15 va del 15 al 14 del siguiente", () => {
      const r = mesRange("2026-10", 15);
      expect(r!.desde.toISOString().slice(0, 10)).toBe("2026-10-15");
      expect(r!.hasta.toISOString().slice(0, 10)).toBe("2026-11-14");
    });

    it("con corte 15 en diciembre cruza el ano", () => {
      const r = mesRange("2026-12", 15);
      expect(r!.desde.toISOString().slice(0, 10)).toBe("2026-12-15");
      expect(r!.hasta.toISOString().slice(0, 10)).toBe("2027-01-14");
    });

    it("con corte 28 respeta los meses cortos", () => {
      const r = mesRange("2026-02", 28);
      expect(r!.desde.toISOString().slice(0, 10)).toBe("2026-02-28");
      expect(r!.hasta.toISOString().slice(0, 10)).toBe("2026-03-27");
    });
  });

  describe("periodoKeyDe", () => {
    it("con corte 1 es el mes calendario", () => {
      expect(periodoKeyDe(new Date("2026-10-20T00:00:00Z"), 1)).toBe("2026-10");
      expect(periodoKeyDe(new Date("2026-10-01T00:00:00Z"), 1)).toBe("2026-10");
    });

    it("con corte 15 una fecha antes del corte pertenece al periodo anterior", () => {
      // 20 de octubre -> el periodo que empezo el 15 de octubre
      expect(periodoKeyDe(new Date("2026-10-20T00:00:00Z"), 15)).toBe("2026-10");
      // 10 de octubre -> el periodo que empezo el 15 de septiembre
      expect(periodoKeyDe(new Date("2026-10-10T00:00:00Z"), 15)).toBe("2026-09");
      // El dia exacto del corte pertenece al periodo nuevo
      expect(periodoKeyDe(new Date("2026-10-15T00:00:00Z"), 15)).toBe("2026-10");
      expect(periodoKeyDe(new Date("2026-10-14T00:00:00Z"), 15)).toBe("2026-09");
    });

    it("con corte 15 cruza el ano correctamente", () => {
      expect(periodoKeyDe(new Date("2027-01-05T00:00:00Z"), 15)).toBe("2026-12");
      expect(periodoKeyDe(new Date("2026-12-20T00:00:00Z"), 15)).toBe("2026-12");
    });
  });

  describe("etiquetaPeriodo", () => {
    it("con corte 1 muestra el nombre del mes", () => {
      expect(etiquetaPeriodo("2026-09", 1)).toBe("Septiembre 2026");
    });

    it("con corte 15 muestra el rango real", () => {
      const l = etiquetaPeriodo("2026-09", 15);
      expect(l).toContain("15 sep");
      expect(l).toContain("14 oct");
    });
  });

  describe("navegacionMes con dia de corte", () => {
    it("no deja avanzar al periodo futuro", () => {
      const hoy = new Date();
      const enCurso = periodoKeyDe(hoy, 15);
      const nav = navegacionMes(enCurso, hoy, 15);
      expect(nav.siguiente).toBeNull();
      expect(nav.anterior).not.toBeNull();
    });
  });

  describe("periodoComparacion con dia de corte", () => {
    it("compara contra el periodo calendario anterior", () => {
      const r = periodoComparacion("2026-10", new Date(), new Date(), 15);
      expect(r.esMes).toBe(true);
      expect(r.desde.toISOString().slice(0, 10)).toBe("2026-09-15");
      expect(r.hasta.toISOString().slice(0, 10)).toBe("2026-10-14");
    });
  });
});
