import { useState, useCallback, useEffect } from "react";
import type { ToolAssignment } from "@/types";

const LS_KEY = "herramientas:tool_assignments";

function migrateAssignment(a: any): ToolAssignment {
  // Convert legacy immoProfileIds → immoDetails with empty vehicle-specific fields
  const immoDetails = a.immoDetails ??
    (a.immoProfileIds ?? []).map((id: string) => ({
      profileId: id,
      transponder: "",
      generadoConIds: [],
      equiposRemotoIds: [],
      equiposTransponderIds: [],
      programacionManual: false,
      programacionOBD: false,
      procedimientoProgramacion: "",
    }));
  return {
    ...a,
    keycodeProfileIds: a.keycodeProfileIds ?? (a.keycodeProfileId ? [a.keycodeProfileId] : []),
    alarmaProfileIds: a.alarmaProfileIds ?? [],
    immoDetails,
  };
}

function loadFromStorage(): ToolAssignment[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as any[]).map(migrateAssignment) : [];
  } catch {
    return [];
  }
}

export function useToolAssignments() {
  const [assignments, setAssignments] = useState<ToolAssignment[]>(loadFromStorage);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(assignments));
  }, [assignments]);

  const addAssignment = useCallback((assignment: ToolAssignment) => {
    setAssignments((prev) => [assignment, ...prev]);
  }, []);

  const updateAssignment = useCallback((updated: ToolAssignment) => {
    setAssignments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }, []);

  const deleteAssignment = useCallback((id: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { assignments, setAssignments, addAssignment, updateAssignment, deleteAssignment };
}
