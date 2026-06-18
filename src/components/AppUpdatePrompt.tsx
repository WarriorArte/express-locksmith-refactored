import { useCallback, useEffect, useRef, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getPhpAuthToken, phpApiRequest } from "@/lib/phpApi";

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
const SERVICE_WORKER_CHECK_STORAGE_KEY = "cerrajeria:last-service-worker-check";

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

export function AppUpdatePrompt() {
  const [hasVersionUpdate, setHasVersionUpdate] = useState(false);
  const [hasServiceWorkerUpdate, setHasServiceWorkerUpdate] = useState(false);
  const [updateNotice, setUpdateNotice] = useState<UpdateNotice | null>(() =>
    typeof window === "undefined" ? null : readCachedNotice(),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const latestVersionRef = useRef<string | null>(null);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  const checkVersion = useCallback(async (force = false) => {
    if (!force && !shouldRunDailyCheck(VERSION_CHECK_STORAGE_KEY)) return;

    try {
      const nextVersion = await fetchBuildVersion();

      if (!nextVersion) return;

      markDailyCheck(VERSION_CHECK_STORAGE_KEY);

      if (nextVersion !== __APP_BUILD_VERSION__ && nextVersion !== dismissedVersion) {
        latestVersionRef.current = nextVersion;
        setHasVersionUpdate(true);
      }
    } catch {
      // version.json is created only in production builds; ignore local/dev misses.
    }
  }, [dismissedVersion]);

  const checkUpdateNotice = useCallback(async () => {
    if (!shouldRunDailyCheck(NOTICE_CHECK_STORAGE_KEY)) return;
    if (!getPhpAuthToken()) return;

    try {
      const notice = await fetchUpdateNotice();
      markDailyCheck(NOTICE_CHECK_STORAGE_KEY);

      if (!notice) {
        writeCachedNotice(null);
        setUpdateNotice(null);
        return;
      }

      const dismissedNoticeKey = window.localStorage.getItem(NOTICE_DISMISSED_STORAGE_KEY);
      if (notice.notice_key !== dismissedNoticeKey) {
        writeCachedNotice(notice);
        setUpdateNotice(notice);
      }
    } catch {
      // Ignore notice checks when the API is unavailable; the next daily window will retry.
    }
  }, []);

  useEffect(() => {
    void checkVersion();
    void checkUpdateNotice();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkVersion();
        void checkUpdateNotice();
      }
    };
    const onOnline = () => {
      void checkVersion();
      void checkUpdateNotice();
    };

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [checkUpdateNotice, checkVersion]);

  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

    let reloadPending = false;
    let serviceWorkerCheckId = 0;

    const onControllerChange = () => {
      if (reloadPending) return;
      reloadPending = true;
      window.location.reload();
    };

    const watchInstallingWorker = (worker: ServiceWorker | null) => {
      if (!worker) return;

      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          waitingWorkerRef.current = worker;
          setHasServiceWorkerUpdate(true);
        }
      });
    };

    const registerServiceWorker = async () => {
      try {
        const base = import.meta.env.BASE_URL || "/";
        const normalizedBase = base.endsWith("/") ? base : `${base}/`;
        const registration = await navigator.serviceWorker.register(`${normalizedBase}sw.js`);

        if (registration.waiting && navigator.serviceWorker.controller) {
          waitingWorkerRef.current = registration.waiting;
          setHasServiceWorkerUpdate(true);
        }

        watchInstallingWorker(registration.installing);

        registration.addEventListener("updatefound", () => {
          watchInstallingWorker(registration.installing);
        });

        serviceWorkerCheckId = window.setInterval(() => {
          if (navigator.onLine && shouldRunDailyCheck(SERVICE_WORKER_CHECK_STORAGE_KEY)) {
            markDailyCheck(SERVICE_WORKER_CHECK_STORAGE_KEY);
            void registration.update();
          }
        }, DAILY_CHECK_INTERVAL_MS);

        if (navigator.onLine && shouldRunDailyCheck(SERVICE_WORKER_CHECK_STORAGE_KEY)) {
          markDailyCheck(SERVICE_WORKER_CHECK_STORAGE_KEY);
          void registration.update();
        }
      } catch {
        // Ignore service worker registration issues; version polling remains active.
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    void registerServiceWorker();

    return () => {
      window.clearInterval(serviceWorkerCheckId);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const hasNotice = !!updateNotice;
  const isNoticeForced = !!updateNotice?.force_refresh;
  const showPrompt = hasNotice || hasServiceWorkerUpdate || hasVersionUpdate;

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

    if (waitingWorkerRef.current) {
      waitingWorkerRef.current.postMessage({ type: "SKIP_WAITING" });
      window.setTimeout(() => window.location.reload(), 2_000);
      return;
    }

    window.location.reload();
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
    }

    setHasVersionUpdate(false);
    setHasServiceWorkerUpdate(false);
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
