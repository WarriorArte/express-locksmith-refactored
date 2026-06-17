import { useCallback } from "react";
import type { ToolAssignment } from "@/types";
import { useJsonResource } from "./useJsonResource";

function migrate(items: any[]): ToolAssignment[] {
  return items.map((a: any) => {
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
    } as ToolAssignment;
  });
}

export function useToolAssignments() {
  const { items, setItems, addItem, updateItem, deleteItem } = useJsonResource<ToolAssignment>({
    endpoint: "/herramientas/tool-assignments",
    migrate,
  });

  const setAssignments = useCallback((next: ToolAssignment[] | ((prev: ToolAssignment[]) => ToolAssignment[])) => {
    setItems(next as any);
  }, [setItems]);

  return {
    assignments: items,
    setAssignments,
    addAssignment: addItem,
    updateAssignment: updateItem,
    deleteAssignment: deleteItem,
  };
}
