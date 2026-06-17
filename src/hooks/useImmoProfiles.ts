import type { ImmoProfile } from "@/types";
import { useJsonResource } from "./useJsonResource";

function migrate(items: any[]): ImmoProfile[] {
  return (items as ImmoProfile[]).map((p) => ({
    ...p,
    generacionRemoto: p.generacionRemoto ?? [],
  }));
}

export function useImmoProfiles() {
  const { items, addItem, updateItem, deleteItem } = useJsonResource<ImmoProfile>({
    endpoint: "/herramientas/immo-profiles",
    cacheKey: "herramientas:immo_profiles",
    migrate,
  });
  return {
    profiles: items,
    addProfile: addItem,
    updateProfile: updateItem,
    deleteProfile: deleteItem,
  };
}
