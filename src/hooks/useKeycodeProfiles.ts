import { useCallback } from "react";
import type { KeycodeProfile, BittingConfig } from "@/types";
import { useJsonResource } from "./useJsonResource";

function migrate(items: any[]): KeycodeProfile[] {
  return (items as KeycodeProfile[]).map((profile) => {
    if (!profile.bittingConfig) {
      const defaultConfig: BittingConfig = { length: 8, maxDepth: 4, depthMapping: undefined };
      return { ...profile, bittingConfig: defaultConfig };
    }
    return profile;
  });
}

export function useKeycodeProfiles() {
  const { items, setItems, addItem, updateItem, deleteItem } = useJsonResource<KeycodeProfile>({
    endpoint: "/herramientas/keycode-profiles",
    cacheKey: "herramientas:keycode_profiles",
    migrate,
  });

  const setProfiles = useCallback((updater: KeycodeProfile[] | ((prev: KeycodeProfile[]) => KeycodeProfile[])) => {
    setItems(updater as any);
  }, [setItems]);

  return {
    profiles: items,
    setProfiles,
    addProfile: addItem,
    updateProfile: updateItem,
    deleteProfile: deleteItem,
  };
}
