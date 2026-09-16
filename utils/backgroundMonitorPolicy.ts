export const MIN_INTERVAL_MINUTES = 15;
export const MAX_INTERVAL_MINUTES = 30;

export function normalizeInterval(value: number): number {
  return Number.isFinite(value)
    ? Math.min(MAX_INTERVAL_MINUTES, Math.max(MIN_INTERVAL_MINUTES, Math.round(value)))
    : MIN_INTERVAL_MINUTES;
}

export function classifyConnectivity(neutralAccessible: number, controlAccessible: number) {
  if (neutralAccessible > 0) return "open";
  return controlAccessible > 0 ? "whitelist" : "offline";
}

export function shouldNotify(previous: string | null, hasWhitelist: boolean, testEnabled: boolean) {
  return testEnabled || previous !== String(hasWhitelist);
}
