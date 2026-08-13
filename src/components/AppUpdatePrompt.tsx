import { useCallback, useEffect, useRef, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getPhpAuthToken, phpApiRequest } from "@/lib/phpApi";
import { MANUAL_UPDATE_CHECK_EVENT, type ManualUpdateCheckDetail } from "@/lib/appUpdates";

type BuildVersion = {
  version?: string;
  buildTime?: string;
};

type UpdateNotice = {
  title: string;
  body: string | null;
  force_refresh: boolean | number;
  notice_key: string;
};

const DAILY_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1_000;
const VERSION_CHECK_STORAGE_KEY = "cerrajeria:last-version-check";
const NOTICE_CHECK_STORAGE_KEY = "cerrajeria:last-update-notice-check";
const NOTICE_DISMISSED_STORAGE_KEY = "cerrajeria:dismissed-update-notice";
const NOTICE_CACHE_STORAGE_KEY = "cerrajeria:cached-update-notice";
const VERSION_DISMISSED_STORAGE_KEY = "cerrajeria:dismissed-version";

function buildVersionUrl(): string {
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const path = `${normalizedBase}version.json`;
  const url = new URL(path, window.location.origin);

  url.searchParams.set("t", Date.now().toString());

  return url.toString();
}

async function fetchBuildVersion(): Promise<string | null> {
  const response = await fetch(buildVersionUrl(), {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as BuildVersion;
  return data.version || data.buildTime || null;
}

async function fetchUpdateNotice(): Promise<UpdateNotice | null> {
  return phpApiRequest<UpdateNotice | null>("/update-notices.php", {
    method: "GET",
  });
}

function shouldRunDailyCheck(storageKey: string): boolean {
  try {
    const lastCheck = Number(window.localStorage.getItem(storageKey) || "0");
    return !lastCheck || Date.now() - lastCheck >= DAILY_CHECK_INTERVAL_MS;
  } catch {
    return true;
  }
}

function markDailyCheck(storageKey: string): void {
  try {
    window.localStorage.setItem(storageKey, Date.now().toString());
  } catch {
    // localStorage can be unavailable in private browsing or restricted contexts.
  }
}

function readCachedNotice(): UpdateNotice | null {
  try {
    const raw = window.localStorage.getItem(NOTICE_CACHE_STORAGE_KEY);
    if (!raw) return null;

    const notice = JSON.parse(raw) as UpdateNotice;
    const dismissedNoticeKey = window.localStorage.getItem(NOTICE_DISMISSED_STORAGE_KEY);

    return notice.notice_key && notice.notice_key !== dismissedNoticeKey ? notice : null;
  } catch {
    return null;
  }
}

function writeCachedNotice(notice: UpdateNotice | null): void {
  try {
    if (!notice) {
      window.localStorage.removeItem(NOTICE_CACHE_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(NOTICE_CACHE_STORAGE_KEY, JSON.stringify(notice));
  } catch {
    // noop
  }
}

function clearCheckMarkers(): void {
  try {
    window.localStorage.removeItem(VERSION_CHECK_STORAGE_KEY);
    window.localStorage.removeItem(NOTICE_CHECK_STORAGE_KEY);
  } catch {
    // noop
  }
}

/**
 * Forces the browser to drop the cached app shell and load the new build in a
 * single step (a plain location.reload() can re-serve the stale HTML, which is
 * why the prompt used to require two taps).
 */
async function hardReload(): Promise<void> {
  clearCheckMarkers();

  try {
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.allSettled(cacheNames.map((name) => caches.delete(name)));
    }
  } catch {
    // noop
  }

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    // noop
  }

  const url = new URL(window.location.href);
  url.searchParams.set("_v", Date.now().toString(36));
  window.location.replace(url.toString());
}

export function AppUpdatePrompt() {
  const [hasVersionUpdate, setHasVersionUpdate] = useState(false);
  const [updateNotice, setUpdateNotice] = useState<UpdateNotice | null>(() =>
    typeof window === "undefined" ? null : readCachedNotice(),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(VERSION_DISMISSED_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const latestVersionRef = useRef<string | null>(null);

  const checkVersion = useCallback(async (force = false) => {
    if (!force && !shouldRunDailyCheck(VERSION_CHECK_STORAGE_KEY)) return false;

    try {
      const nextVersion = await fetchBuildVersion();

      if (!nextVersion) return false;

      markDailyCheck(VERSION_CHECK_STORAGE_KEY);

      if (nextVersion !== __APP_BUILD_VERSION__ && (force || nextVersion !== dismissedVersion)) {
        latestVersionRef.current = nextVersion;
        setHasVersionUpdate(true);
        return true;
      }
    } catch {
      // version.json is created only in production builds; ignore local/dev misses.
    }

    return false;
  }, [dismissedVersion]);

  const checkUpdateNotice = useCallback(async (force = false) => {
    if (!force && !shouldRunDailyCheck(NOTICE_CHECK_STORAGE_KEY)) return false;
    if (!getPhpAuthToken()) return false;

    try {
      const notice = await fetchUpdateNotice();
      markDailyCheck(NOTICE_CHECK_STORAGE_KEY);

      if (!notice) {
        writeCachedNotice(null);
        setUpdateNotice(null);
        return false;
      }

      const dismissedNoticeKey = window.localStorage.getItem(NOTICE_DISMISSED_STORAGE_KEY);
      if (force || notice.notice_key !== dismissedNoticeKey) {
        writeCachedNotice(notice);
        setUpdateNotice(notice);
        return true;
      }
    } catch {
      // Ignore notice checks when the API is unavailable; the next daily window will retry.
    }

    return false;
  }, []);

  const isCheckingRef = useRef(false);

  const runChecks = useCallback(async (force = false) => {
    // Automatic checks are limited to the per-browser daily gate so the Laravel
    // backend is not polled; `force` comes from the manual button in settings.
    if (isCheckingRef.current) return false;
    if (!navigator.onLine) return false;

    isCheckingRef.current = true;

    try {
      const [hasVersion, hasNotice] = [await checkVersion(force), await checkUpdateNotice(force)];

      return hasVersion || hasNotice;
    } finally {
      isCheckingRef.current = false;
    }
  }, [checkUpdateNotice, checkVersion]);

  useEffect(() => {
    void runChecks();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void runChecks();
    };

    const onManualCheck = (event: Event) => {
      const detail = (event as CustomEvent<ManualUpdateCheckDetail>).detail;

      void runChecks(true).then((updateAvailable) => {
        detail?.resolve?.({ updateAvailable });
      });
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener(MANUAL_UPDATE_CHECK_EVENT, onManualCheck);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener(MANUAL_UPDATE_CHECK_EVENT, onManualCheck);
    };
  }, [runChecks]);

  const hasNotice = !!updateNotice;
  const isNoticeForced = !!updateNotice?.force_refresh;
  const showPrompt = hasNotice || hasVersionUpdate;

  const refreshApp = async () => {
    setIsRefreshing(true);

    if (updateNotice) {
      try {
        window.localStorage.setItem(NOTICE_DISMISSED_STORAGE_KEY, updateNotice.notice_key);
      } catch {
        // noop
      }
      writeCachedNotice(null);
      setUpdateNotice(null);
    }

    await hardReload();
  };

  const dismissPrompt = () => {
    if (updateNotice && !isNoticeForced) {
      try {
        window.localStorage.setItem(NOTICE_DISMISSED_STORAGE_KEY, updateNotice.notice_key);
      } catch {
        // noop
      }
      writeCachedNotice(null);
      setUpdateNotice(null);
    }

    if (latestVersionRef.current) {
      setDismissedVersion(latestVersionRef.current);
      try {
        window.localStorage.setItem(VERSION_DISMISSED_STORAGE_KEY, latestVersionRef.current);
      } catch {
        // noop
      }
    }

    setHasVersionUpdate(false);
  };

  if (!showPrompt) return null;

  const noticeLines = updateNotice?.body
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="fixed inset-x-3 bottom-3 z-[120] mx-auto max-w-2xl rounded-lg border border-border bg-background/95 p-3 text-foreground shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:bottom-5 sm:flex sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Download className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-5">
            {updateNotice?.title || "Hay una nueva version disponible"}
          </p>
          {noticeLines?.length ? (
            <ul className="mt-1 max-h-28 space-y-1 overflow-auto pr-2 text-xs leading-5 text-muted-foreground">
              {noticeLines.map((line) => (
                <li key={line}>{line.replace(/^[-*]\s*/, "")}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Actualiza para cargar los ultimos cambios del sistema.
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 sm:mt-0">
        <Button type="button" size="sm" onClick={refreshApp} disabled={isRefreshing}>
          <RefreshCw className={isRefreshing ? "animate-spin" : ""} />
          Actualizar
        </Button>
        {!isNoticeForced && (
          <Button type="button" variant="ghost" size="icon" aria-label="Ocultar aviso" onClick={dismissPrompt}>
            <X />
          </Button>
        )}
      </div>
    </div>
  );
}
