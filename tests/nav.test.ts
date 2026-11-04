import { describe, expect, it } from "vitest";
import {
  ClipboardCheck,
  LayoutDashboard,
  Receipt,
  Smartphone,
  Wallet,
} from "lucide-react";
import {
  navItemForPathname,
  muestraSelectorPeriodo,
} from "../src/lib/nav";

describe("navItemForPathname", () => {
  it("resuelve el icono de cada página de dinero y operación", () => {
    expect(navItemForPathname("/")?.icon).toBe(LayoutDashboard);
    expect(navItemForPathname("/cierre")?.icon).toBe(ClipboardCheck);
    expect(navItemForPathname("/transferencia")?.icon).toBe(Smartphone);
    expect(navItemForPathname("/gastos")?.icon).toBe(Receipt);
    expect(navItemForPathname("/retiros")?.icon).toBe(Wallet);
  });
});

describe("muestraSelectorPeriodo", () => {
  it("lo muestra únicamente en las páginas que filtran por período", () => {
    for (const pathname of [
      "/",
      "/cierre",
      "/transferencia",
      "/gastos",
      "/retiros",
    ]) {
      expect(muestraSelectorPeriodo(pathname)).toBe(true);
    }

    for (const pathname of [
      "/pedidos",
      "/proveedores",
      "/usuarios",
      "/configuracion",
    ]) {
      expect(muestraSelectorPeriodo(pathname)).toBe(false);
    }
  });
});
