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
apiBaseCandidates.push("https://keylune.app/api");
// ===== KEYLUNE FALLBACK END =====

const API_BASES = Array.from(
  new Set(apiBaseCandidates.filter(Boolean).map((base) => base!.replace(/\/$/, ""))),
);
const API_BASE = API_BASES[0];

if (typeof window !== "undefined" && !(window as any).__PHP_API_BASE_LOGGED__) {
  (window as any).__PHP_API_BASE_LOGGED__ = true;
  console.info("[phpApi] BASE =", API_BASE);
}

const STORAGE_BASE = API_BASE.replace(/\/api(\/.*)?$/, "");

export function resolveStorageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("/")) return `${STORAGE_BASE}${path}`;
  if (path.startsWith("blob:") || path.startsWith("data:")) return path;
  try {
    const parsed = new URL(path);
    return `${STORAGE_BASE}${parsed.pathname}`;
  } catch {
    return path;
  }
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

  for (let index = 0; index < API_BASES.length; index += 1) {
    const base = API_BASES[index];
    const hasNextBase = index < API_BASES.length - 1;

    try {
      const result = await requestFromBase(base);
      response = result.response;
      payload = result.payload;

      if (hasNextBase && [404, 405, 502, 503, 504].includes(response.status)) {
        continue;
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
