import { useCallback, useEffect, useState } from "react";
import type { KeycodeProfile, BittingConfig, CodeEntry } from "@/types";
import { phpApiRequest } from "@/lib/phpApi";

const ENDPOINT = "/herramientas/keycode-profiles";

function migrate(items: KeycodeProfile[]): KeycodeProfile[] {
  return items.map((p) => {
    if (!p.bittingConfig) {
      const defaultConfig: BittingConfig = { length: 8, maxDepth: 4 };
      return { ...p, bittingConfig: defaultConfig };
    }
    return p;
  });
}

function buildSample(codes: CodeEntry[]): CodeEntry[] {
  if (codes.length === 0) return [];
  return [codes[Math.floor(codes.length / 2)]];
}

/** Devuelve el perfil con codesData vacío y codesCount/codeSample listos para la vista de lista. */
function stripCodes(profile: KeycodeProfile): KeycodeProfile {
  return {
    ...profile,
    codesData:  [],
    codesCount: profile.codesCount ?? profile.codesData.length,
    codeSample: profile.codeSample ?? buildSample(profile.codesData),
  };
}

export function useKeycodeProfiles() {
  const [profiles, setProfiles] = useState<KeycodeProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    phpApiRequest<KeycodeProfile[]>(ENDPOINT, { method: "GET" })
      .then((data) => { if (!cancelled) setProfiles(migrate(data ?? [])); })
      .catch(() => { if (!cancelled) setProfiles([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  /** Carga el perfil completo con todos sus codesData (usado al abrir el editor). */
  const fetchProfileWithCodes = useCallback(async (id: string): Promise<KeycodeProfile | null> => {
    try {
      return await phpApiRequest<KeycodeProfile>(`${ENDPOINT}?id=${encodeURIComponent(id)}`, { method: "GET" });
    } catch {
      return null;
    }
  }, []);

  const addProfile = useCallback((profile: KeycodeProfile) => {
    const prev = profiles;
    setProfiles((p) => [stripCodes(profile), ...p]);
    phpApiRequest(ENDPOINT, { method: "POST", body: JSON.stringify(profile) })
      .catch(() => setProfiles(prev));
  }, [profiles]);

  const updateProfile = useCallback((profile: KeycodeProfile) => {
    const prev = profiles;
    setProfiles((p) => p.map((x) => (x.id === profile.id ? stripCodes(profile) : x)));
    phpApiRequest(`${ENDPOINT}?id=${encodeURIComponent(profile.id)}`, {
      method: "PUT",
      body: JSON.stringify(profile),
    }).catch(() => setProfiles(prev));
  }, [profiles]);

  const deleteProfile = useCallback((id: string) => {
    const prev = profiles;
    setProfiles((p) => p.filter((x) => x.id !== id));
    phpApiRequest(`${ENDPOINT}?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      .catch(() => setProfiles(prev));
  }, [profiles]);

  return {
    profiles,
    setProfiles,
    addProfile,
    updateProfile,
    deleteProfile,
    fetchProfileWithCodes,
    loading,
  };
}
