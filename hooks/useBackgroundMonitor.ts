import { pingSite } from "@/utils/sitePinger";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundFetch from "expo-background-fetch";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

const BACKGROUND_MONITOR_TASK = "background-whitelist-monitor";
const STORAGE_KEY_ENABLED = "background-monitor-enabled";
const STORAGE_KEY_INTERVAL = "background-monitor-interval-minutes";
const STORAGE_KEY_HAS_WHITELIST = "last-whitelist-state";
const DEFAULT_INTERVAL_MINUTES = 15;
const OPTIMIZED_NEUTRAL_SITES = [
  "https://gitlab.com",
  "https://google.com",
  "https://2ip.io",
];

async function performWhitelistCheck(notifyOnlyOnChange: boolean) {
  const Network = await import("expo-network");
  const { isVpnActive } = await import("react-native-vpn-detector");
  const networkState = await Network.getNetworkStateAsync();
  const isVpn = isVpnActive();
  const isWifi = networkState.type === Network.NetworkStateType.WIFI;

  if (isVpn || isWifi) {
    return { skipped: true, reason: "Обнаружен VPN или Wi-Fi" } as const;
  }

  const results = await Promise.all(OPTIMIZED_NEUTRAL_SITES.map(pingSite));
  const accessibleCount = results.filter((result) => result.accessible).length;
  const hasWhitelist = accessibleCount === 0;
  const previousValue = await AsyncStorage.getItem(STORAGE_KEY_HAS_WHITELIST);
  const stateChanged =
    previousValue !== null && previousValue !== String(hasWhitelist);

  await AsyncStorage.setItem(STORAGE_KEY_HAS_WHITELIST, String(hasWhitelist));

  if (!notifyOnlyOnChange || stateChanged) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: hasWhitelist
          ? "⚠️ Белый список включён"
          : "✅ Белый список выключен",
        body: hasWhitelist
          ? "Доступ к нейтральным сайтам пропал. Обнаружен белый список."
          : `Доступ восстановлен. Доступно сайтов: ${accessibleCount}/${OPTIMIZED_NEUTRAL_SITES.length}.`,
        data: {
          hasWhitelist,
          accessibleCount,
          totalSites: OPTIMIZED_NEUTRAL_SITES.length,
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });
  }

  return {
    skipped: false,
    hasWhitelist,
    accessibleCount,
    totalSites: OPTIMIZED_NEUTRAL_SITES.length,
    notificationSent: !notifyOnlyOnChange || stateChanged,
  } as const;
}

TaskManager.defineTask(BACKGROUND_MONITOR_TASK, async () => {
  try {
    if ((await AsyncStorage.getItem(STORAGE_KEY_ENABLED)) !== "true") {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const result = await performWhitelistCheck(true);
    return result.skipped
      ? BackgroundFetch.BackgroundFetchResult.NoData
      : BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("[BackgroundMonitor] Error:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

async function unregisterMonitorTask() {
  if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_MONITOR_TASK)) {
    await TaskManager.unregisterTaskAsync(BACKGROUND_MONITOR_TASK);
  }
}

async function registerMonitorTask(intervalMinutes: number) {
  await unregisterMonitorTask();
  await BackgroundFetch.registerTaskAsync(BACKGROUND_MONITOR_TASK, {
    minimumInterval: intervalMinutes * 60,
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

export function useBackgroundMonitor() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [intervalMinutes, setIntervalMinutesState] = useState(
    DEFAULT_INTERVAL_MINUTES,
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const registrationQueue = useRef(Promise.resolve());

  useEffect(() => {
    void (async () => {
      try {
        const [enabled, savedInterval] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_ENABLED),
          AsyncStorage.getItem(STORAGE_KEY_INTERVAL),
        ]);
        const parsedInterval = Number(savedInterval);
        setIsEnabled(enabled === "true");
        setIntervalMinutesState(
          savedInterval !== null && Number.isFinite(parsedInterval)
            ? Math.min(30, Math.max(5, Math.round(parsedInterval)))
            : DEFAULT_INTERVAL_MINUTES,
        );
      } catch (error) {
        console.error("Failed to load monitor settings:", error);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    void (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") await Notifications.requestPermissionsAsync();
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    })();
  }, []);

  useEffect(() => {
    if (!isLoaded || Platform.OS === "web") return;
    const timeout = setTimeout(() => {
      registrationQueue.current = registrationQueue.current.then(async () => {
        try {
          if (isEnabled) await registerMonitorTask(intervalMinutes);
          else await unregisterMonitorTask();
        } catch (error) {
          console.error("[BackgroundMonitor] Task registration error:", error);
        }
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [intervalMinutes, isEnabled, isLoaded]);

  const toggleMonitor = useCallback(async () => {
    const newState = !isEnabled;
    try {
      await AsyncStorage.setItem(STORAGE_KEY_ENABLED, String(newState));
      setIsEnabled(newState);
    } catch (error) {
      console.error("Failed to toggle monitor:", error);
    }
  }, [isEnabled]);

  const setIntervalMinutes = useCallback(async (minutes: number) => {
    const normalized = Math.min(30, Math.max(5, Math.round(minutes)));
    setIntervalMinutesState(normalized);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_INTERVAL, String(normalized));
    } catch (error) {
      console.error("Failed to save monitor interval:", error);
    }
  }, []);

  const testBackgroundTask = useCallback(async () => {
    try {
      return await performWhitelistCheck(false);
    } catch (error) {
      console.error("[TestBackground] Error:", error);
      return { error: String(error) };
    }
  }, []);

  return {
    isEnabled,
    intervalMinutes,
    setIntervalMinutes,
    toggleMonitor,
    testBackgroundTask,
  };
}
