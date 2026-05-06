/// <reference types="vite/client" />

const runtimeApiBase =
  typeof window !== "undefined"
    ? (window as Window & { __PHP_API_BASE__?: string }).__PHP_API_BASE__
    : undefined;

const envApiBase = import.meta.env.VITE_PHP_API_BASE as string | undefined;
const API_BASE = (runtimeApiBase || envApiBase || `${import.meta.env.BASE_URL}php/api`).replace(/\/$/, "");

if (typeof window !== "undefined" && !(window as any).__PHP_API_BASE_LOGGED__) {
  (window as any).__PHP_API_BASE_LOGGED__ = true;
  console.info("[phpApi] BASE =", API_BASE);
}

const AUTH_TOKEN_KEY = "ce_php_auth_token";

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
    throw new Error(message);
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

export async function phpApiUpload(file: File, folder: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  return phpApiRequest<{ url: string; name: string; mime: string; size: number; folder: string }>("/uploads.php", {
    method: "POST",
    body: formData,
  });
}
