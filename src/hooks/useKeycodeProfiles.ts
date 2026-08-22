import { useCallback, useEffect, useState } from "react";
import type { KeycodeProfile, BittingConfig, CodeEntry } from "@/types";
import { phpApiRequest } from "@/lib/phpApi";

const ENDPOINT = "/herramientas/keycode-profiles";
/** Tamaño de lote para subir códigos (series grandes). */
const CHUNK_SIZE = 3000;

/** Resultado de búsqueda por código: incluye el bitting Valet si existe para ese mismo código. */
export interface KeycodeSearchResult extends CodeEntry {
  valetBitting?: string[] | null;
}

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

  /**
   * Búsqueda server-side de códigos (series grandes). positions: null = comodín,
   * string[] = valores aceptados (±1). partial: secuencia de dígitos que debe
   * aparecer contigua en el bitting, en cualquier posición.
   */
  const searchCodes = useCallback(async (
    profileId: string,
    opts: { codigo?: string; positions?: (string[] | null)[]; partial?: string; limit?: number; offset?: number },
  ): Promise<{ total: number; results: KeycodeSearchResult[] }> => {
    const params = new URLSearchParams({ profile_id: profileId });
    if (opts.codigo) params.set("codigo", opts.codigo);
    if (opts.positions) params.set("positions", JSON.stringify(opts.positions));
    if (opts.partial) params.set("partial", opts.partial);
    if (opts.limit != null) params.set("limit", String(opts.limit));
    if (opts.offset != null) params.set("offset", String(opts.offset));
    try {
      const data = await phpApiRequest<{ total: number; results: KeycodeSearchResult[] }>(
        `/herramientas/keycode-search?${params.toString()}`,
        { method: "GET" },
      );
      return { total: data?.total ?? 0, results: data?.results ?? [] };
    } catch {
      return { total: 0, results: [] };
    }
  }, []);

  /**
   * Sube los códigos en lotes pequeños (evita payloads gigantes y timeouts de PHP).
   * Al final compara el conteo confirmado por el servidor contra lo esperado: si una
   * subida se interrumpió a medias (red caída, pestaña cerrada), lo detecta aquí en
   * vez de dejar la serie truncada en silencio.
   * `dataset`: "normal" (keycode_codes) o "valet" (keycode_valet_codes, mismo código
   * con bitting distinto — llave de acceso restringido).
   */
  const uploadCodesInChunks = useCallback(async (
    profileId: string,
    codes: CodeEntry[],
    onProgress?: (done: number, total: number) => void,
    dataset: "normal" | "valet" = "normal",
  ) => {
    const total = codes.length;
    let serverTotal = 0;
    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = codes.slice(i, i + CHUNK_SIZE).map((c) => ({
        codigo: c.codigo,
        bitting: Array.isArray(c.bitting) ? c.bitting.join("") : c.bitting,
      }));
      const result = await phpApiRequest<{ inserted: number; total: number }>("/herramientas/keycode-codes", {
        method: "POST",
        body: JSON.stringify({
          profile_id: profileId,
          mode: i === 0 ? "replace" : "append",
          dataset,
          codes: chunk,
        }),
      });
      serverTotal = result?.total ?? serverTotal;
      onProgress?.(Math.min(i + CHUNK_SIZE, total), total);
    }
    // Serie vacía: limpiar códigos existentes
    if (total === 0) {
      await phpApiRequest("/herramientas/keycode-codes", {
        method: "POST",
        body: JSON.stringify({ profile_id: profileId, mode: "replace", dataset, codes: [] }),
      });
      return;
    }
    if (serverTotal !== total) {
      throw new Error(`Subida incompleta: se esperaban ${total} códigos pero el servidor confirma ${serverTotal}.`);
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
        body: JSON.stringify(big ? { ...profile, codesData: [], codesIncomplete: true } : profile),
      });
      if (big) {
        await uploadCodesInChunks(profile.id, profile.codesData, onProgress);
        // Subida completa y verificada: limpiar la marca de incompleto (servidor y estado local).
        const { codesData: _codesData, ...meta } = profile;
        await phpApiRequest(`${ENDPOINT}?id=${encodeURIComponent(profile.id)}`, {
          method: "PUT",
          body: JSON.stringify({ ...meta, codesIncomplete: false }),
        });
        setProfiles((p) => p.map((x) => (x.id === profile.id ? { ...x, codesIncomplete: false } : x)));
      }
    } catch {
      setProfiles(prev);
      throw new Error("No se pudo guardar la serie");
    }
  }, [profiles, uploadCodesInChunks]);

  const updateProfile = useCallback(async (
    profile: KeycodeProfile,
    onProgress?: (done: number, total: number) => void,
    codesChanged: boolean = true,
  ) => {
    const prev = profiles;
    setProfiles((p) => p.map((x) => (x.id === profile.id ? stripCodes(profile) : x)));
    try {
      const big = profile.codesData.length > CHUNK_SIZE;
      const { codesData, ...meta } = profile;
      // codesChanged=false: solo se editó otra pestaña (visual, decoder, referencias...).
      // No se toca keycode_codes en absoluto, sea cual sea el tamaño de la serie.
      const willUploadInChunks = big && codesChanged;

      await phpApiRequest(`${ENDPOINT}?id=${encodeURIComponent(profile.id)}`, {
        method: "PUT",
        body: JSON.stringify(
          !codesChanged ? meta : big ? { ...meta, codesIncomplete: true } : profile
        ),
      });

      if (willUploadInChunks) {
        await uploadCodesInChunks(profile.id, codesData, onProgress);
        // Subida completa y verificada: limpiar la marca de incompleto (servidor y estado local).
        await phpApiRequest(`${ENDPOINT}?id=${encodeURIComponent(profile.id)}`, {
          method: "PUT",
          body: JSON.stringify({ ...meta, codesIncomplete: false }),
        });
        setProfiles((p) => p.map((x) => (x.id === profile.id ? { ...x, codesIncomplete: false } : x)));
      }
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
