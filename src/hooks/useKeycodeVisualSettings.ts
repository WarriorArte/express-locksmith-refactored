import { useCallback, useEffect, useState } from "react";
import type { KeycodeVisualSettings } from "@/types";
import { phpApiRequest } from "@/lib/phpApi";

const ENDPOINT = "/herramientas/keycode-visual-settings";

export const KEYCODE_VISUAL_DEFAULTS: KeycodeVisualSettings = {
  strokeColorLight: "#00AEE6",
  strokeColorDark: "#00AEE6",
  strokeWidth: 3.5,
};

export function useKeycodeVisualSettings() {
  const [settings, setSettings] = useState<KeycodeVisualSettings>(KEYCODE_VISUAL_DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    phpApiRequest<KeycodeVisualSettings>(ENDPOINT, { method: "GET" })
      .then((data) => { if (!cancelled && data) setSettings({ ...KEYCODE_VISUAL_DEFAULTS, ...data }); })
      .catch(() => { /* usa los valores por defecto */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const saveSettings = useCallback(async (next: KeycodeVisualSettings) => {
    const prev = settings;
    setSettings(next);
    try {
      await phpApiRequest<KeycodeVisualSettings>(ENDPOINT, { method: "PUT", body: JSON.stringify(next) });
    } catch (err) {
      setSettings(prev);
      throw err;
    }
  }, [settings]);

  return { settings, setSettings, loading, saveSettings };
}
