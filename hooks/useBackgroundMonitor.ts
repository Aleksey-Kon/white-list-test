import { pingSite } from "@/utils/sitePinger";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundFetch from "expo-background-fetch";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

const BACKGROUND_MONITOR_TASK = "background-whitelist-monitor";
const STORAGE_KEY_ENABLED = "background-monitor-enabled";
const STORAGE_KEY_HAS_WHITELIST = "last-whitelist-state";

// Определяем задачу для фоновой работы
TaskManager.defineTask(BACKGROUND_MONITOR_TASK, async () => {
  try {
    // Проверяем, включен ли мониторинг
    const enabled = await AsyncStorage.getItem(STORAGE_KEY_ENABLED);
    if (enabled !== "true") {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Проверяем сеть (VPN/WiFi)
    const Network = await import("expo-network");
    const { isVpnActive } = await import("react-native-vpn-detector");

    const networkState = await Network.getNetworkStateAsync();
    const isVpn = isVpnActive();
    const isWifi = networkState.type === Network.NetworkStateType.WIFI;

    // Если VPN или WiFi - пропускаем проверку
    if (isVpn || isWifi) {
      console.log("[BackgroundMonitor] Skipped: VPN or WiFi detected");
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    // Проверяем только часть нейтральных сайтов для оптимизации
    const OPTIMIZED_NEUTRAL_SITES = [
      "https://github.com",
      "https://google.com",
      "https://2ip.io",
    ];

    const results = await Promise.all(
      OPTIMIZED_NEUTRAL_SITES.map((url) => pingSite(url)),
    );

    const accessibleCount = results.filter((r) => r.accessible).length;
    const hasWhitelist = accessibleCount === 0; // Если все недоступны = белый список

    // Получаем предыдущее состояние
    const previousHasWhitelist = await AsyncStorage.getItem(
      STORAGE_KEY_HAS_WHITELIST,
    );
    const previousWhitelist = previousHasWhitelist === "true";

    // Сохраняем новое состояние
    await AsyncStorage.setItem(STORAGE_KEY_HAS_WHITELIST, String(hasWhitelist));

    // Отправляем уведомление всегда (если не пропущено)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: hasWhitelist
          ? "⚠️ Обнаружен белый список"
          : "✅ Белый список не обнаружен",
        body: hasWhitelist
          ? "Приложение обнаружило наличие белых списков на вашем устройстве."
          : `Проверка завершена. Доступно сайтов: ${accessibleCount}/${OPTIMIZED_NEUTRAL_SITES.length}`,
        data: {
          hasWhitelist,
          accessibleCount,
          totalSites: OPTIMIZED_NEUTRAL_SITES.length,
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Немедленно
    });

    console.log(
      `[BackgroundMonitor] Check: ${hasWhitelist ? "whitelist" : "no whitelist"} (${accessibleCount}/${OPTIMIZED_NEUTRAL_SITES.length} accessible)`,
    );

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("[BackgroundMonitor] Error:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export function useBackgroundMonitor() {
  const [isEnabled, setIsEnabled] = useState<boolean>(false);

  // Загрузка состояния из AsyncStorage
  useEffect(() => {
    const loadState = async () => {
      try {
        const enabled = await AsyncStorage.getItem(STORAGE_KEY_ENABLED);
        setIsEnabled(enabled === "true");
      } catch (error) {
        console.error("Failed to load monitor state:", error);
      }
    };
    loadState();
  }, []);

  // Запрос разрешений на уведомления
  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS !== "web") {
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          console.log("Notification permissions not granted");
        }

        // Настройка поведения уведомлений в приложении
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
      }
    };
    requestPermissions();
  }, []);

  // Регистрация/снятие фоновой задачи
  useEffect(() => {
    const registerTask = async () => {
      try {
        if (isEnabled && Platform.OS !== "web") {
          await BackgroundFetch.registerTaskAsync(BACKGROUND_MONITOR_TASK, {
            minimumInterval: 5 * 60, // 5 минут (в секундах)
            stopOnTerminate: false,
            startOnBoot: true,
          });
          console.log("[BackgroundMonitor] Task registered");
        } else {
          const isRegistered = await TaskManager.isTaskRegisteredAsync(
            BACKGROUND_MONITOR_TASK,
          );
          if (isRegistered) {
            await TaskManager.unregisterTaskAsync(BACKGROUND_MONITOR_TASK);
            console.log("[BackgroundMonitor] Task unregistered");
          }
        }
      } catch (error) {
        console.error("[BackgroundMonitor] Task registration error:", error);
      }
    };

    registerTask();
  }, [isEnabled]);

  // Функция переключения состояния
  const toggleMonitor = async () => {
    const newState = !isEnabled;
    try {
      await AsyncStorage.setItem(STORAGE_KEY_ENABLED, String(newState));
      setIsEnabled(newState);

      // При выключении снимаем задачу
      if (!newState) {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(
          BACKGROUND_MONITOR_TASK,
        );
        if (isRegistered) {
          await TaskManager.unregisterTaskAsync(BACKGROUND_MONITOR_TASK);
        }
      }
    } catch (error) {
      console.error("Failed to toggle monitor:", error);
    }
  };

  // Функция для тестирования фоновой задачи (выполняет ту же логику)
  const testBackgroundTask = async () => {
    try {
      console.log("[TestBackground] Starting test...");

      // Проверяем сеть (VPN/WiFi)
      const Network = await import("expo-network");
      const { isVpnActive } = await import("react-native-vpn-detector");

      const networkState = await Network.getNetworkStateAsync();
      const isVpn = isVpnActive();
      const isWifi = networkState.type === Network.NetworkStateType.WIFI;

      // Если VPN или WiFi - пропускаем проверку
      if (isVpn || isWifi) {
        console.log("[TestBackground] Skipped: VPN or WiFi detected");
        return { skipped: true, reason: "VPN or WiFi detected" };
      }

      // Проверяем только часть нейтральных сайтов для оптимизации
      const OPTIMIZED_NEUTRAL_SITES = [
        "https://github.com",
        "https://google.com",
        "https://2ip.io",
      ];

      const results = await Promise.all(
        OPTIMIZED_NEUTRAL_SITES.map((url) => pingSite(url)),
      );

      const accessibleCount = results.filter((r) => r.accessible).length;
      const hasWhitelist = accessibleCount === 0; // Если все недоступны = белый список

      // Получаем предыдущее состояние
      const previousHasWhitelist = await AsyncStorage.getItem(
        STORAGE_KEY_HAS_WHITELIST,
      );
      const previousWhitelist = previousHasWhitelist === "true";

      // Сохраняем новое состояние
      await AsyncStorage.setItem(
        STORAGE_KEY_HAS_WHITELIST,
        String(hasWhitelist),
      );

      // Отправляем уведомление всегда при тесте (если не пропущено)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: hasWhitelist
            ? "⚠️ Обнаружен белый список"
            : "✅ Белый список не обнаружен",
          body: hasWhitelist
            ? "Приложение обнаружило наличие белых списков на вашем устройстве."
            : `Проверка завершена. Доступно сайтов: ${accessibleCount}/${OPTIMIZED_NEUTRAL_SITES.length}`,
          data: {
            hasWhitelist,
            accessibleCount,
            totalSites: OPTIMIZED_NEUTRAL_SITES.length,
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Немедленно
      });

      console.log(
        `[TestBackground] Check: ${hasWhitelist ? "whitelist" : "no whitelist"} (${accessibleCount}/${OPTIMIZED_NEUTRAL_SITES.length} accessible)`,
      );

      return {
        skipped: false,
        hasWhitelist,
        accessibleCount,
        totalSites: OPTIMIZED_NEUTRAL_SITES.length,
        notificationSent: true,
      };
    } catch (error) {
      console.error("[TestBackground] Error:", error);
      return { error: String(error) };
    }
  };

  return {
    isEnabled,
    toggleMonitor,
    testBackgroundTask,
  };
}
