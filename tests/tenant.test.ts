import { describe, it, expect } from "vitest";
import { snapshotEsDeEstaTienda } from "../src/lib/tenant";

describe("snapshotEsDeEstaTienda", () => {
  it("acepta el snapshot de la propia tienda", () => {
    expect(snapshotEsDeEstaTienda("tienda-a", "tienda-a")).toBe(true);
  });

  it("rechaza el snapshot de otra tienda", () => {
    // Es el ataque: un cliente de la tienda A manda un snapshot con el
    // tiendaId de la tienda B, y la server action lo escribe tal cual.
    expect(snapshotEsDeEstaTienda("tienda-b", "tienda-a")).toBe(false);
  });

  it("rechaza un snapshot sin tiendaId", () => {
    expect(snapshotEsDeEstaTienda(undefined, "tienda-a")).toBe(false);
    expect(snapshotEsDeEstaTienda(null, "tienda-a")).toBe(false);
    expect(snapshotEsDeEstaTienda("", "tienda-a")).toBe(false);
  });

  it("no acepta el string vacio como tienda", () => {
    expect(snapshotEsDeEstaTienda("tienda-a", "")).toBe(false);
  });
});
