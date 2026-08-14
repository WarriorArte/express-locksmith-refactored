import { useCallback, useEffect, useState } from "react";
import type { KeycodeProfile, BittingConfig, CodeEntry } from "@/types";
import { phpApiRequest } from "@/lib/phpApi";

const ENDPOINT = "/herramientas/keycode-profiles";
/** Tamaño de lote para subir códigos (series grandes). */
const CHUNK_SIZE = 3000;

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

  /** Búsqueda server-side de códigos (series grandes). positions: null = comodín, string[] = valores aceptados (±1). */
  const searchCodes = useCallback(async (
    profileId: string,
    opts: { codigo?: string; positions?: (string[] | null)[]; limit?: number; offset?: number },
  ): Promise<{ total: number; results: CodeEntry[] }> => {
    const params = new URLSearchParams({ profile_id: profileId });
    if (opts.codigo) params.set("codigo", opts.codigo);
    if (opts.positions) params.set("positions", JSON.stringify(opts.positions));
    if (opts.limit != null) params.set("limit", String(opts.limit));
    if (opts.offset != null) params.set("offset", String(opts.offset));
    try {
      const data = await phpApiRequest<{ total: number; results: CodeEntry[] }>(
        `/herramientas/keycode-search?${params.toString()}`,
        { method: "GET" },
      );
      return { total: data?.total ?? 0, results: data?.results ?? [] };
    } catch {
      return { total: 0, results: [] };
    }
  }, []);

  /** Sube los códigos en lotes pequeños (evita payloads gigantes y timeouts de PHP). */
  const uploadCodesInChunks = useCallback(async (
    profileId: string,
    codes: CodeEntry[],
    onProgress?: (done: number, total: number) => void,
  ) => {
    const total = codes.length;
    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = codes.slice(i, i + CHUNK_SIZE).map((c) => ({
        codigo: c.codigo,
        bitting: Array.isArray(c.bitting) ? c.bitting.join("") : c.bitting,
      }));
      await phpApiRequest("/herramientas/keycode-codes", {
        method: "POST",
        body: JSON.stringify({
          profile_id: profileId,
          mode: i === 0 ? "replace" : "append",
          codes: chunk,
        }),
      });
      onProgress?.(Math.min(i + CHUNK_SIZE, total), total);
    }
    // Serie vacía: limpiar códigos existentes
    if (total === 0) {
      await phpApiRequest("/herramientas/keycode-codes", {
        method: "POST",
        body: JSON.stringify({ profile_id: profileId, mode: "replace", codes: [] }),
      });
    }
  }, []);

  const addProfile = useCallback(async (
    profile: KeycodeProfile,
    onProgress?: (done: number, total: number) => void,
  ) => {
    const prev = profiles;
    setProfiles((p) => [stripCodes(profile), ...p]);
    try {
      const big = profile.codesData.length > CHUNK_SIZE;
      await phpApiRequest(ENDPOINT, {
        method: "POST",
        body: JSON.stringify(big ? { ...profile, codesData: [] } : profile),
      });
      if (big) await uploadCodesInChunks(profile.id, profile.codesData, onProgress);
    } catch {
      setProfiles(prev);
      throw new Error("No se pudo guardar la serie");
    }
  }, [profiles, uploadCodesInChunks]);

  const updateProfile = useCallback(async (
    profile: KeycodeProfile,
    onProgress?: (done: number, total: number) => void,
  ) => {
    const prev = profiles;
    setProfiles((p) => p.map((x) => (x.id === profile.id ? stripCodes(profile) : x)));
    try {
      const big = profile.codesData.length > CHUNK_SIZE;
      const { codesData, ...meta } = profile;
      await phpApiRequest(`${ENDPOINT}?id=${encodeURIComponent(profile.id)}`, {
        method: "PUT",
        body: JSON.stringify(big ? meta : profile),
      });
      if (big) await uploadCodesInChunks(profile.id, codesData, onProgress);
    } catch {
      setProfiles(prev);
      throw new Error("No se pudo actualizar la serie");
    }
  }, [profiles, uploadCodesInChunks]);

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
    searchCodes,
    uploadCodesInChunks,
    loading,
  };

}
