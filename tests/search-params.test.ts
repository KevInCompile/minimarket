import { describe, it, expect } from "vitest";
import {
  parseMesLabel,
  mesRange,
  mesKey,
} from "../src/lib/dates";
import { parseFiltrosComunes, filtrosToQuery } from "../src/lib/search-params";

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
