import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import {
  getMonitorSnapshot,
  initializeMonitor,
  monitorError,
  MonitorSettings,
  MonitorSnapshot,
  updateMonitorSettings,
} from "@/services/backgroundMonitor";

export function useBackgroundMonitor() {
  const [snapshot, setSnapshot] = useState<MonitorSnapshot>({
    settings: { isEnabled: false, isTestEnabled: false, intervalMinutes: 15 },
    isRegistered: false, issue: null, lastRun: null,
  });
  const [isBusy, setIsBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(false);
  const busy = useRef(true);

  useEffect(() => {
    let active = true;
    mounted.current = true;
    const refresh = async (initialize: boolean) => {
      if (!initialize && busy.current) return;
      busy.current = true;
      if (active) setIsBusy(true);
      try {
        const next = await (initialize ? initializeMonitor() : getMonitorSnapshot());
        if (active) {
          setSnapshot(next);
          setError(null);
        }
      } catch (cause) {
        if (active) setError(monitorError(cause));
      } finally {
        if (active) {
          busy.current = false;
          setIsBusy(false);
        }
      }
    };
    void refresh(true);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh(false);
    });
    return () => {
      active = false;
      mounted.current = false;
      subscription.remove();
    };
  }, []);

  const update = useCallback(async (patch: Partial<MonitorSettings>) => {
    if (busy.current) return;
    busy.current = true;
    setIsBusy(true);
    setError(null);
    try {
      const next = await updateMonitorSettings(patch);
      if (mounted.current) setSnapshot(next);
    } catch (cause) {
      if (mounted.current) setError(monitorError(cause));
    } finally {
      busy.current = false;
      if (mounted.current) setIsBusy(false);
    }
  }, []);

  return {
    ...snapshot.settings,
    isBusy,
    isRegistered: snapshot.isRegistered,
    lastRun: snapshot.lastRun,
    error: error ?? snapshot.issue,
    setIntervalMinutes: (minutes: number) => update({ intervalMinutes: minutes }),
    toggleMonitor: () => update({ isEnabled: !snapshot.settings.isEnabled }),
    toggleBackgroundTest: (enabled: boolean) => update({ isTestEnabled: enabled }),
  };
}
