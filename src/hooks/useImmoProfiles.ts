import type { ImmoProfile } from "@/types";
import { useJsonResource } from "./useJsonResource";

function migrate(items: any[]): ImmoProfile[] {
  return (items as ImmoProfile[]).map((p) => ({
    ...p,
    generacionRemoto: p.generacionRemoto ?? [],
  }));
}

export function useImmoProfiles() {
  const { items, addItem, updateItem, deleteItem, loading } = useJsonResource<ImmoProfile>({
    endpoint: "/herramientas/immo-profiles",
    migrate,
  });
  return {
    profiles: items,
    /** true mientras se descargan los perfiles del servidor. */
    loading,
    addProfile: addItem,
    updateProfile: updateItem,
    deleteProfile: deleteItem,
  };
}
