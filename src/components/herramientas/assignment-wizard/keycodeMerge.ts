/**
 * Guardado inteligente de Keycode en el asistente.
 *
 * Para cada serie elegida se miran las asignaciones de Keycode que ya tiene el vehículo:
 *  - si la serie ya cubre todos los años → no se hace nada;
 *  - si faltan años pegados a una asignación existente de esa serie (y esa asignación no
 *    tiene otras series que no se eligieron) → se amplían sus años;
 *  - los años que sigan faltando → asignación nueva solo con esos años.
 * Así nunca quedan series repetidas para el mismo vehículo y año.
 */
import type { LockSelectionsMap, ToolAssignment } from "@/types";

export type KeycodeOutcome =
  | { kind: "unchanged"; pid: string; existing: ToolAssignment }
  | { kind: "extend"; pid: string; existing: ToolAssignment; yearStart: number; yearEnd: number }
  | { kind: "create"; pid: string; segments: { yearStart: number; yearEnd: number }[]; partial: boolean };

export interface KeycodeMergePlan {
  outcomes: KeycodeOutcome[];
  /** Asignaciones existentes a las que se les amplían los años. */
  updates: { assignment: ToolAssignment; yearStart: number; yearEnd: number; pids: string[] }[];
  /** Asignaciones nuevas (series agrupadas por rango de años). */
  creates: { pids: string[]; yearStart: number; yearEnd: number }[];
}

/** Segmentos contiguos de años. */
function toSegments(years: number[]): { yearStart: number; yearEnd: number }[] {
  const out: { yearStart: number; yearEnd: number }[] = [];
  for (const y of years) {
    const last = out[out.length - 1];
    if (last && y === last.yearEnd + 1) last.yearEnd = y;
    else out.push({ yearStart: y, yearEnd: y });
  }
  return out;
}

/**
 * @param vehicleAssignments asignaciones de Keycode del MISMO vehículo (marca + modelo), cualquier año.
 */
export function planKeycodeSave(
  vehicleAssignments: ToolAssignment[],
  pids: string[],
  yearStart: number,
  yearEnd: number,
): KeycodeMergePlan {
  const selected = new Set(pids);
  const outcomes: KeycodeOutcome[] = [];
  const updates = new Map<string, { assignment: ToolAssignment; yearStart: number; yearEnd: number; pids: string[] }>();
  const creates = new Map<string, { pids: string[]; yearStart: number; yearEnd: number }>();

  for (const pid of pids) {
    const withPid = vehicleAssignments.filter((a) => (a.keycodeProfileIds ?? []).includes(pid));
    const missing: number[] = [];
    for (let y = yearStart; y <= yearEnd; y++) {
      if (!withPid.some((a) => a.yearStart <= y && a.yearEnd >= y)) missing.push(y);
    }
    const overlapping = withPid.find((a) => a.yearStart <= yearEnd && a.yearEnd >= yearStart);
    if (!missing.length) {
      outcomes.push({ kind: "unchanged", pid, existing: overlapping ?? withPid[0] });
      continue;
    }

    // Solo se amplía una asignación cuyas series están todas elegidas (no se arrastran otras).
    const extendable = withPid.filter((a) => (a.keycodeProfileIds ?? []).every((id) => selected.has(id)));
    let extended: { existing: ToolAssignment; yearStart: number; yearEnd: number } | null = null;
    const leftover: { yearStart: number; yearEnd: number }[] = [];
    for (const seg of toSegments(missing)) {
      const target = extendable.find((a) => a.yearEnd === seg.yearStart - 1 || a.yearStart === seg.yearEnd + 1);
      if (!target) { leftover.push(seg); continue; }
      const prev = updates.get(target.id);
      const ys = Math.min(prev?.yearStart ?? target.yearStart, seg.yearStart);
      const ye = Math.max(prev?.yearEnd ?? target.yearEnd, seg.yearEnd);
      updates.set(target.id, {
        assignment: target,
        yearStart: ys,
        yearEnd: ye,
        pids: Array.from(new Set([...(prev?.pids ?? []), pid])),
      });
      extended = { existing: target, yearStart: ys, yearEnd: ye };
    }
    if (extended) outcomes.push({ kind: "extend", pid, ...extended });
    if (leftover.length) {
      outcomes.push({ kind: "create", pid, segments: leftover, partial: withPid.length > 0 });
      for (const seg of leftover) {
        const key = `${seg.yearStart}-${seg.yearEnd}`;
        const c = creates.get(key) ?? { pids: [], yearStart: seg.yearStart, yearEnd: seg.yearEnd };
        c.pids.push(pid);
        creates.set(key, c);
      }
    }
  }

  return { outcomes, updates: Array.from(updates.values()), creates: Array.from(creates.values()) };
}

/** Cerraduras al ampliar: se conservan las existentes; solo se agregan las de series que no tenían. */
export function mergeLocks(
  existing: LockSelectionsMap | undefined,
  incoming: LockSelectionsMap,
  pids: string[],
): LockSelectionsMap | undefined {
  const out: LockSelectionsMap = { ...(existing ?? {}) };
  for (const pid of pids) {
    if (!out[pid] && incoming[pid] && Object.keys(incoming[pid]).length) out[pid] = incoming[pid];
  }
  return Object.keys(out).length ? out : undefined;
}
