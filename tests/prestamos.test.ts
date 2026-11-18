import { describe, it, expect } from "vitest";
import {
  validaPrestamo,
  parseEstadoFiltro,
  filtraPorEstado,
  totalesPrestamos,
  ordenaPrestamos,
  type EstadoFiltro,
  type PrestamoResumen,
} from "../src/lib/prestamos";

/**
 * Reglas del módulo Préstamos:
 *
 *  - Un préstamo es un registro de control: persona (texto libre), valor y
 *    fecha. No toca el balance.
 *  - Se marca como pagado (todo o nada) y puede volver a pendiente.
 *  - La lista se filtra por estado (pendientes / pagados / todos) y los
 *    pendientes se muestran primero.
 */

const dia = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const HOY = dia("2026-11-07");

const prestamo = (
  overrides: Partial<PrestamoResumen> & { id: string },
): PrestamoResumen => ({
  fecha: dia("2026-11-01"),
  persona: "Ana",
  valor: 100000,
  nota: null,
  pagado: false,
  fechaPago: null,
  ...overrides,
});

describe("validaPrestamo", () => {
  it("acepta un préstamo válido", () => {
    const r = validaPrestamo(
      { fecha: "2026-11-05", persona: "  Ana  ", valor: "150000", nota: "para el almuerzo" },
      HOY,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.fecha.toISOString()).toBe("2026-11-05T00:00:00.000Z");
    expect(r.data.persona).toBe("Ana");
    expect(r.data.valor).toBe(150000);
    expect(r.data.nota).toBe("para el almuerzo");
  });

  it("rechaza una fecha inválida", () => {
    const r = validaPrestamo(
      { fecha: "05/11/2026", persona: "Ana", valor: "1000" },
      HOY,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.campo).toBe("fecha");
  });

  it("rechaza una fecha futura", () => {
    const r = validaPrestamo(
      { fecha: "2026-11-08", persona: "Ana", valor: "1000" },
      HOY,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.campo).toBe("fecha");
  });

  it("rechaza una fecha que no existe en el calendario", () => {
    const r = validaPrestamo(
      { fecha: "2026-02-31", persona: "Ana", valor: "1000" },
      HOY,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.campo).toBe("fecha");
  });

  it("rechaza la persona vacía", () => {
    const r = validaPrestamo(
      { fecha: "2026-11-05", persona: "   ", valor: "1000" },
      HOY,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.campo).toBe("persona");
  });

  it("rechaza una persona demasiado larga", () => {
    const r = validaPrestamo(
      { fecha: "2026-11-05", persona: "a".repeat(200), valor: "1000" },
      HOY,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.campo).toBe("persona");
  });

  it("rechaza un valor que no es número", () => {
    const r = validaPrestamo(
      { fecha: "2026-11-05", persona: "Ana", valor: "mucho" },
      HOY,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.campo).toBe("valor");
  });

  it("rechaza un valor de cero", () => {
    const r = validaPrestamo(
      { fecha: "2026-11-05", persona: "Ana", valor: "0" },
      HOY,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.campo).toBe("valor");
  });

  it("rechaza un valor negativo", () => {
    const r = validaPrestamo(
      { fecha: "2026-11-05", persona: "Ana", valor: "-5000" },
      HOY,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.campo).toBe("valor");
  });

  it("acepta el valor con separador de miles", () => {
    const r = validaPrestamo(
      { fecha: "2026-11-05", persona: "Ana", valor: "180.000" },
      HOY,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.valor).toBe(180000);
  });

  it("una nota vacía queda en null", () => {
    const r = validaPrestamo(
      { fecha: "2026-11-05", persona: "Ana", valor: "1000", nota: "  " },
      HOY,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.nota).toBeNull();
  });

  it("rechaza una nota demasiado larga", () => {
    const r = validaPrestamo(
      { fecha: "2026-11-05", persona: "Ana", valor: "1000", nota: "x".repeat(600) },
      HOY,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.campo).toBe("nota");
  });
});

describe("parseEstadoFiltro", () => {
  it("reconoce los estados válidos", () => {
    expect(parseEstadoFiltro("pendientes")).toBe("pendientes");
    expect(parseEstadoFiltro("pagados")).toBe("pagados");
    expect(parseEstadoFiltro("todos")).toBe("todos");
  });

  it("un estado desconocido cae en todos", () => {
    expect(parseEstadoFiltro("raro")).toBe("todos");
    expect(parseEstadoFiltro(undefined)).toBe("todos");
  });

  it("una clave repetida toma el primer valor", () => {
    expect(parseEstadoFiltro(["pagados", "pendientes"])).toBe("pagados");
  });
});

describe("filtraPorEstado", () => {
  const lista = [
    prestamo({ id: "1", pagado: false }),
    prestamo({ id: "2", pagado: true }),
    prestamo({ id: "3", pagado: false }),
  ];

  it("filtra los pendientes", () => {
    expect(filtraPorEstado(lista, "pendientes").map((p) => p.id)).toEqual(["1", "3"]);
  });

  it("filtra los pagados", () => {
    expect(filtraPorEstado(lista, "pagados").map((p) => p.id)).toEqual(["2"]);
  });

  it("todos devuelve la lista completa", () => {
    expect(filtraPorEstado(lista, "todos")).toHaveLength(3);
  });
});

describe("totalesPrestamos", () => {
  it("suma el total, lo pendiente y lo pagado", () => {
    const t = totalesPrestamos([
      prestamo({ id: "1", valor: 100000, pagado: false }),
      prestamo({ id: "2", valor: 50000, pagado: true }),
      prestamo({ id: "3", valor: 25000, pagado: false }),
    ]);
    expect(t.total).toBe(175000);
    expect(t.pendiente).toBe(125000);
    expect(t.pagado).toBe(50000);
    expect(t.cantidad).toBe(3);
    expect(t.cantidadPendientes).toBe(2);
    expect(t.cantidadPagados).toBe(1);
  });

  it("una lista vacía da totales en cero", () => {
    const t = totalesPrestamos([]);
    expect(t.total).toBe(0);
    expect(t.pendiente).toBe(0);
    expect(t.pagado).toBe(0);
    expect(t.cantidad).toBe(0);
  });
});

describe("ordenaPrestamos", () => {
  it("deja los pendientes primero y dentro de cada grupo va el más reciente arriba", () => {
    const lista = [
      prestamo({ id: "a", fecha: dia("2026-11-01"), pagado: true }),
      prestamo({ id: "b", fecha: dia("2026-11-05"), pagado: false }),
      prestamo({ id: "c", fecha: dia("2026-11-03"), pagado: true }),
      prestamo({ id: "d", fecha: dia("2026-11-02"), pagado: false }),
    ];
    expect(ordenaPrestamos(lista).map((p) => p.id)).toEqual(["b", "d", "c", "a"]);
  });

  it("no muta el arreglo original", () => {
    const lista = [
      prestamo({ id: "a", fecha: dia("2026-11-01"), pagado: true }),
      prestamo({ id: "b", fecha: dia("2026-11-05"), pagado: false }),
    ];
    ordenaPrestamos(lista);
    expect(lista.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("con lista vacía devuelve lista vacía", () => {
    expect(ordenaPrestamos([])).toEqual([]);
  });
});

describe("tipos", () => {
  it("el filtro por estado es un conjunto cerrado", () => {
    const estados: EstadoFiltro[] = ["todos", "pendientes", "pagados"];
    expect(estados).toHaveLength(3);
  });
});
