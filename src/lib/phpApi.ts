/// <reference types="vite/client" />

const runtimeApiBase =
  typeof window !== "undefined"
    ? (window as Window & { __PHP_API_BASE__?: string }).__PHP_API_BASE__
    : undefined;

const envApiBase = import.meta.env.VITE_PHP_API_BASE as string | undefined;
const localApiBase = `${import.meta.env.BASE_URL}api`;
const apiBaseCandidates = [runtimeApiBase, envApiBase, localApiBase];

// ===== KEYLUNE FALLBACK START =====
// Cuarto fallback: solo se intenta si los anteriores no responden como API.
// Para quitarlo, selecciona este bloque completo y borralo.
apiBaseCandidates.push("https://keylune.com/api");
// ===== KEYLUNE FALLBACK END =====

const API_BASES = Array.from(
  new Set(apiBaseCandidates.filter(Boolean).map((base) => base!.replace(/\/$/, ""))),
);
const API_BASE = API_BASES[0];
const ACTIVE_API_BASE_KEY = "ce_php_active_api_base";

function getStoredActiveApiBase() {
  if (typeof window === "undefined") return null;
  const storedBase = localStorage.getItem(ACTIVE_API_BASE_KEY);
  return storedBase && API_BASES.includes(storedBase) ? storedBase : null;
}

function setActiveApiBase(base: string) {
  activeApiBase = base;
  if (typeof window !== "undefined") {
    localStorage.setItem(ACTIVE_API_BASE_KEY, base);
  }
}

let activeApiBase = getStoredActiveApiBase() || API_BASE;
let apiBaseResolutionPromise: Promise<string> | null = null;

function getStorageBase() {
  return activeApiBase.replace(/\/api(\/.*)?$/, "");
}

function isApiBaseUnavailableStatus(status: number) {
  return [404, 405, 502, 503, 504].includes(status);
}

async function ensureActiveApiBase(headers: Headers) {
  if (apiBaseResolutionPromise) return apiBaseResolutionPromise;

  apiBaseResolutionPromise = (async () => {
    const orderedApiBases = [activeApiBase, ...API_BASES.filter((base) => base !== activeApiBase)];
    let lastError: unknown = null;

    for (const base of orderedApiBases) {
      try {
        const response = await fetch(`${base}/auth/me`, {
          method: "GET",
          headers,
        });

        if (!isApiBaseUnavailableStatus(response.status)) {
          setActiveApiBase(base);
          return activeApiBase;
        }
      } catch (error) {
        lastError = error;
      }
    }

    apiBaseResolutionPromise = null;
    throw lastError instanceof Error ? lastError : new Error("No se pudo conectar con la API");
  })();

  return apiBaseResolutionPromise;
}

export function resolveStorageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const storageBase = getStorageBase();
  if (path.startsWith("/")) return `${storageBase}${path}`;
  if (path.startsWith("blob:") || path.startsWith("data:")) return path;
  try {
    const parsed = new URL(path);
    return `${storageBase}${parsed.pathname}`;
  } catch {
    return path;
  }
}

export function resolveUploadFileUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const resolved = resolveStorageUrl(path);
  if (!resolved) return null;

  const marker = "/uploads/";
  const markerIndex = resolved.indexOf(marker);
  if (markerIndex === -1) return resolved;

  const relativePath = resolved.slice(markerIndex + marker.length);
  return `${activeApiBase}/uploads.php?action=file&f=${encodeURIComponent(relativePath)}`;
}

export function getStorableUrl(url: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("token");
    return parsed.toString();
  } catch {
    return url;
  }
}

const AUTH_TOKEN_KEY = "ce_php_auth_token";

export class PhpApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "PhpApiError";
    this.status = status;
    this.payload = payload;
  }
}

type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
};

type ApiError = {
  success: false;
  message: string;
};

async function parseJson(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Respuesta JSON invalida");
  }
}

export function setPhpAuthToken(token: string | null) {
  if (typeof window === "undefined") return;

  if (!token) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    return;
  }

  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function getPhpAuthToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function clearPhpAuthToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export async function phpApiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const headers = new Headers(init?.headers || {});

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const token = getPhpAuthToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  await ensureActiveApiBase(headers);

  const requestFromBase = async (base: string) => {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers,
    });
    const payload = await parseJson(response);
    return { response, payload };
  };

  let response: Response;
  let payload: unknown;
  let lastApiUnavailableError: unknown = null;

  const orderedApiBases = [activeApiBase, ...API_BASES.filter((base) => base !== activeApiBase)];

  for (let index = 0; index < orderedApiBases.length; index += 1) {
    const base = orderedApiBases[index];
    const hasNextBase = index < orderedApiBases.length - 1;

    try {
      const result = await requestFromBase(base);
      response = result.response;
      payload = result.payload;

      if (hasNextBase && isApiBaseUnavailableStatus(response.status)) {
        apiBaseResolutionPromise = null;
        continue;
      }

      if (response.ok) {
        setActiveApiBase(base);
        apiBaseResolutionPromise = Promise.resolve(base);
      }

      break;
    } catch (error) {
      lastApiUnavailableError = error;
      if (!hasNextBase) {
        throw error;
      }
    }
  }

  if (!response!) {
    throw lastApiUnavailableError instanceof Error
      ? lastApiUnavailableError
      : new Error("No se pudo conectar con la API");
  }

  if (!response.ok) {
    const message = (payload as ApiError | null)?.message || "Error de solicitud";

    if (response.status === 401) {
      clearPhpAuthToken();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) {
        window.location.href = "/auth";
      }
    }

    throw new PhpApiError(message, response.status, payload);
  }

  if (payload && typeof payload === "object" && "success" in payload) {
    const apiPayload = payload as ApiSuccess<T> | ApiError;
    if (!apiPayload.success) {
      throw new Error(apiPayload.message || "Error de API");
    }
    return apiPayload.data as T;
  }

  return payload as T;
}


export async function phpApiUpload(file: File, folder: string, workshopCode?: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  if (workshopCode) formData.append("workshop_code", workshopCode);

  return phpApiRequest<{ url: string; name: string; mime: string; size: number; folder: string }>("/uploads.php", {
    method: "POST",
    body: formData,
  });
}

export async function phpApiDeleteFile(imageUrl: string): Promise<void> {
  const match = imageUrl.match(/\/uploads\/([^/]+)\/([^/]+)\/([^/?#]+)/);
  if (!match) return;
  const [, workshopCode, folder, filename] = match;
  const formData = new FormData();
  formData.append("filename", filename);
  formData.append("folder", folder);
  formData.append("workshop_code", workshopCode);
  try {
    await phpApiRequest<null>("/uploads.php?action=delete", { method: "POST", body: formData });
  } catch {
    // Fire-and-forget: ignore errors on file deletion
  }
}

export async function phpApiCleanup(workshopCode?: string, folder?: string) {
  const formData = new FormData();
  if (workshopCode) formData.append("workshop_code", workshopCode);
  if (folder) formData.append("folder", folder);
  return phpApiRequest<{ deleted: number; kept: number }>("/uploads.php?action=cleanup", {
    method: "POST",
    body: formData,
  });
}
