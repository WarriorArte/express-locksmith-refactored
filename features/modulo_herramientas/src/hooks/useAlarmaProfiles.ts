import { useState, useCallback, useEffect } from "react";
import type { AlarmaProfile } from "@/types";

const LS_KEY = "herramientas:alarma_profiles";

function loadFromStorage(): AlarmaProfile[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useAlarmaProfiles() {
  const [profiles, setProfiles] = useState<AlarmaProfile[]>(loadFromStorage);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(profiles));
  }, [profiles]);

  const addProfile = useCallback((profile: AlarmaProfile) => {
    setProfiles((prev) => [profile, ...prev]);
  }, []);

  const updateProfile = useCallback((profile: AlarmaProfile) => {
    setProfiles((prev) => prev.map((p) => (p.id === profile.id ? profile : p)));
  }, []);

  const deleteProfile = useCallback((id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { profiles, addProfile, updateProfile, deleteProfile };
}
