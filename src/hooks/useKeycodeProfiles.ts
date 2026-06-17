import { useState, useCallback, useEffect } from "react";
import type { KeycodeProfile, BittingConfig } from "@/types";

const LS_KEY = "herramientas:keycode_profiles";

function loadFromStorage(): KeycodeProfile[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const profiles = raw ? (JSON.parse(raw) as KeycodeProfile[]) : [];
    
    // Migrar perfiles existentes para incluir configuración por defecto
    return profiles.map(profile => {
      if (!profile.bittingConfig) {
        const defaultConfig: BittingConfig = {
          length: 8,
          maxDepth: 4,
          depthMapping: undefined,
        };
        return { ...profile, bittingConfig: defaultConfig };
      }
      return profile;
    });
  } catch {
    return [];
  }
}

export function useKeycodeProfiles() {
  const [profiles, setProfiles] = useState<KeycodeProfile[]>(loadFromStorage);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(profiles));
  }, [profiles]);

  const addProfile = useCallback((profile: KeycodeProfile) => {
    setProfiles((prev) => [profile, ...prev]);
  }, []);

  const updateProfile = useCallback((profile: KeycodeProfile) => {
    setProfiles((prev) => prev.map((p) => (p.id === profile.id ? profile : p)));
  }, []);

  const deleteProfile = useCallback((id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { profiles, setProfiles, addProfile, updateProfile, deleteProfile };
}
