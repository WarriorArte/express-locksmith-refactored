import type { AlarmaProfile } from "@/types";
import { useJsonResource } from "./useJsonResource";

export function useAlarmaProfiles() {
  const { items, addItem, updateItem, deleteItem } = useJsonResource<AlarmaProfile>({
    endpoint: "/herramientas/alarma-profiles",
  });
  return {
    profiles: items,
    addProfile: addItem,
    updateProfile: updateItem,
    deleteProfile: deleteItem,
  };
}
