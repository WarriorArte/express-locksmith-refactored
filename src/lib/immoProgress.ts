/**
 * Estadística interna del SuperAdmin: cuántos autos lleva ingresados en Immo Info.
 *
 * Cuenta = asignaciones con al menos un perfil Immo (cada asignación es un vehículo:
 * marca + modelo + rango de años; el asistente y el gestor crean una por vehículo).
 */
import type { ToolAssignment } from "@/types";

/** Meta total de autos con Immo Info. */
export const IMMO_GOAL_TOTAL = 900;
/** Ritmo diario planeado (mínimo y máximo). */
export const IMMO_DAILY_MIN = 20;
export const IMMO_DAILY_MAX = 25;

export function isImmoEntry(a: Pick<ToolAssignment, "immoDetails">): boolean {
  return (a.immoDetails?.length ?? 0) > 0;
}

/**
 * Fecha de alta de una asignación. Prioridad: `_createdAt` (la pone el servidor),
 * después `dateAdded` (texto local guardado por la app: «14/11/2026», ISO o «2026-11-14»).
 * Las fechas «d/m/aaaa» se leen con el día primero (formato en español).
 */
export function entryDate(a: Pick<ToolAssignment, "_createdAt" | "dateAdded">): Date | null {
  if (a._createdAt) {
    const d = new Date(a._createdAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const raw = String(a.dateAdded ?? "").trim();
  if (!raw) return null;
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(raw);
  if (dmy) {
    const [, dd, mm, yyyy] = dmy.map(Number);
    const d = new Date(yyyy, mm - 1, dd);
    return d.getMonth() === mm - 1 ? d : null;
  }
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (ymd) {
    // ISO completo (con hora) respeta la zona; «aaaa-mm-dd» solo se toma como fecha local.
    if (raw.length > 10) {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  }
  return null;
}

/** Clave de día local «aaaa-mm-dd». */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface ImmoProgress {
  total: number;
  goal: number;
  percent: number;
  remaining: number;
  today: number;
  /** Últimos 7 días, incluido hoy, del más antiguo al más reciente. */
  last7: { key: string; date: Date; count: number }[];
  last7Total: number;
  /** Días con fecha conocida (para avisar si faltan fechas). */
  undated: number;
  /** Días que faltan al ritmo máximo / mínimo planeado. */
  daysAtMax: number;
  daysAtMin: number;
  /** Fecha estimada de llegada al ritmo máximo / mínimo (null si ya se llegó). */
  etaAtMax: Date | null;
  etaAtMin: Date | null;
}

export function computeImmoProgress(assignments: ToolAssignment[], now: Date = new Date()): ImmoProgress {
  const entries = assignments.filter(isImmoEntry);
  const counts = new Map<string, number>();
  let undated = 0;
  for (const a of entries) {
    const d = entryDate(a);
    if (!d) { undated++; continue; }
    const k = dayKey(d);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
    const key = dayKey(date);
    return { key, date, count: counts.get(key) ?? 0 };
  });

  const total = entries.length;
  const remaining = Math.max(0, IMMO_GOAL_TOTAL - total);
  const daysAtMax = Math.ceil(remaining / IMMO_DAILY_MAX);
  const daysAtMin = Math.ceil(remaining / IMMO_DAILY_MIN);
  const addDays = (n: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + n);

  return {
    total,
    goal: IMMO_GOAL_TOTAL,
    percent: Math.min(100, Math.round((total / IMMO_GOAL_TOTAL) * 100)),
    remaining,
    today: counts.get(dayKey(now)) ?? 0,
    last7,
    last7Total: last7.reduce((s, d) => s + d.count, 0),
    undated,
    daysAtMax,
    daysAtMin,
    etaAtMax: remaining ? addDays(daysAtMax) : null,
    etaAtMin: remaining ? addDays(daysAtMin) : null,
  };
}
