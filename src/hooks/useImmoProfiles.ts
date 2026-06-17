import { useState, useCallback, useEffect } from "react";
import type { ImmoProfile } from "@/types";

const LS_KEY = "herramientas:immo_profiles";

function migrateProfile(p: ImmoProfile): ImmoProfile {
  return {
    ...p,
    generacionRemoto: p.generacionRemoto ?? [],
  };
}

function loadFromStorage(): ImmoProfile[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed: ImmoProfile[] = raw ? JSON.parse(raw) : [];
    return parsed.map(migrateProfile);
  } catch {
    return [];
  }
}

export function useImmoProfiles() {
  const [profiles, setProfiles] = useState<ImmoProfile[]>(loadFromStorage);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(profiles));
  }, [profiles]);

  const addProfile = useCallback((profile: ImmoProfile) => {
    setProfiles((prev) => [profile, ...prev]);
  }, []);

  const updateProfile = useCallback((profile: ImmoProfile) => {
    setProfiles((prev) => prev.map((p) => (p.id === profile.id ? profile : p)));
  }, []);

  const deleteProfile = useCallback((id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { profiles, addProfile, updateProfile, deleteProfile };
}
