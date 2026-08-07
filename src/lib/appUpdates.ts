export const MANUAL_UPDATE_CHECK_EVENT = "app:check-updates";

export type ManualUpdateCheckResult = {
  updateAvailable: boolean;
};

export type ManualUpdateCheckDetail = {
  resolve: (result: ManualUpdateCheckResult) => void;
};

/**
 * Triggers an on-demand update check handled by <AppUpdatePrompt />.
 * Automatic checks stay limited to once per day per browser, so this is the
 * only way for the user to look for updates right now.
 */
export async function requestManualUpdateCheck(): Promise<ManualUpdateCheckResult> {
  if (typeof window === "undefined") return { updateAvailable: false };

  return new Promise<ManualUpdateCheckResult>((resolve) => {
    let settled = false;

    const settle = (result: ManualUpdateCheckResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve(result);
    };

    const timeoutId = window.setTimeout(() => settle({ updateAvailable: false }), 15_000);

    window.dispatchEvent(
      new CustomEvent<ManualUpdateCheckDetail>(MANUAL_UPDATE_CHECK_EVENT, {
        detail: { resolve: settle },
      }),
    );
  });
}
