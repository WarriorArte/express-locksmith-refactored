/// <reference types="vite/client" />

const runtimeApiBase =
  typeof window !== "undefined"
    ? (window as Window & { __PHP_API_BASE__?: string }).__PHP_API_BASE__
    : undefined;

const envApiBase = import.meta.env.VITE_PHP_API_BASE as string | undefined;
const API_BASE = (runtimeApiBase || envApiBase || (() => { throw new Error("[phpApi] VITE_PHP_API_BASE no está definida en .env"); })()).replace(/\/$/, "");

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

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  const payload = await parseJson(response);

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

export function phpApiBaseUrl() {
  return API_BASE;
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
