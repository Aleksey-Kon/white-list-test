import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundTask from "expo-background-task";
import * as Network from "expo-network";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import { classifyConnectivity, normalizeInterval, shouldNotify } from "../utils/backgroundMonitorPolicy";
import { pingSite } from "../utils/sitePinger";

export const BACKGROUND_MONITOR_TASK = "background-whitelist-monitor";
const CHANNEL_ID = "whitelist-monitor";
const TEST_NOTIFICATION_ID = "whitelist-monitor-delivery-test";
const ENABLED_KEY = "background-monitor-enabled";
const TEST_KEY = "background-monitor-test-enabled";
const INTERVAL_KEY = "background-monitor-interval-minutes";
const STATE_KEY = "last-whitelist-state";
const RUN_KEY = "background-monitor-last-run";
const TASK_TYPE = Platform.OS === "ios" ? "backgroundTask" : "expo-background-task";
const NEUTRAL_SITES = ["https://gitlab.com", "https://google.com", "https://2ip.io"];
const CONTROL_SITES = ["https://vk.com", "https://yandex.ru"];

export interface MonitorSettings {
  isEnabled: boolean;
  isTestEnabled: boolean;
  intervalMinutes: number;
}

export interface MonitorRun {
  startedAt: string;
  completedAt?: string;
  status: "running" | "checked" | "skipped" | "error";
  message: string;
  notification: "none" | "scheduled" | "blocked";
}

export interface MonitorSnapshot {
  settings: MonitorSettings;
  isRegistered: boolean;
  issue: string | null;
  lastRun: MonitorRun | null;
}

export function monitorError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Install on headless launches too: notification handling must not depend on mounting a screen.
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function ensureChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Проверка белых списков",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
    });
  }
}

function permissionsGranted(permissions: Notifications.NotificationPermissionsStatus) {
  return permissions.granted || permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

async function notificationIssue(request: boolean): Promise<string | null> {
  // Android 13 requires a channel before the runtime permission prompt.
  await ensureChannel();
  let permissions = await Notifications.getPermissionsAsync();
  if (request && !permissionsGranted(permissions) && permissions.canAskAgain) {
    permissions = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
  }
  if (!permissionsGranted(permissions)) {
    return "Уведомления запрещены. Разрешите их в настройках приложения.";
  }
  if (Platform.OS === "android") {
    const channel = await Notifications.getNotificationChannelAsync(CHANNEL_ID);
    if (!channel || channel.importance === Notifications.AndroidImportance.NONE) {
      return "Канал «Проверка белых списков» отключён. Включите его в настройках уведомлений.";
    }
  }
  return null;
}

async function backgroundIssue(): Promise<string | null> {
  if (Platform.OS === "web" || !(await TaskManager.isAvailableAsync())) {
    return "Фоновый мониторинг доступен в установленной APK/iOS-сборке, не в Expo Go или браузере.";
  }
  if ((await BackgroundTask.getStatusAsync()) !== BackgroundTask.BackgroundTaskStatus.Available) {
    return "Фоновые задачи недоступны. Проверьте фоновое обновление в настройках телефона и используйте установленную сборку.";
  }
  return null;
}

export async function readMonitorSettings(): Promise<MonitorSettings> {
  const values = await AsyncStorage.multiGet([ENABLED_KEY, TEST_KEY, INTERVAL_KEY]);
  const stored = Object.fromEntries(values);
  return {
    isEnabled: stored[ENABLED_KEY] === "true",
    isTestEnabled: stored[TEST_KEY] === "true",
    intervalMinutes: normalizeInterval(Number(stored[INTERVAL_KEY] ?? 15)),
  };
}

async function saveSettings(settings: MonitorSettings) {
  await AsyncStorage.multiSet([
    [ENABLED_KEY, String(settings.isEnabled)],
    [TEST_KEY, String(settings.isTestEnabled)],
    [INTERVAL_KEY, String(settings.intervalMinutes)],
  ]);
}

async function syncRegistration(settings: MonitorSettings) {
  const tasks = await TaskManager.getRegisteredTasksAsync();
  const existing = tasks.find((task) => task.taskName === BACKGROUND_MONITOR_TASK);
  const enabled = settings.isEnabled || settings.isTestEnabled;
  if (existing && enabled && existing.taskType === TASK_TYPE &&
      existing.options?.minimumInterval === settings.intervalMinutes) return;

  if (existing) {
    if (existing.taskType === TASK_TYPE) {
      await BackgroundTask.unregisterTaskAsync(BACKGROUND_MONITOR_TASK);
    } else {
      // Migrate registrations left behind by expo-background-fetch.
      await TaskManager.unregisterTaskAsync(BACKGROUND_MONITOR_TASK);
    }
  }
  if (enabled) {
    await BackgroundTask.registerTaskAsync(BACKGROUND_MONITOR_TASK, {
      minimumInterval: settings.intervalMinutes,
    });
    if (!(await TaskManager.isTaskRegisteredAsync(BACKGROUND_MONITOR_TASK))) {
      throw new Error("Система не зарегистрировала фоновую задачу.");
    }
  }
}

async function scheduleDeliveryTest() {
  await Notifications.cancelScheduledNotificationAsync(TEST_NOTIFICATION_ID);
  await Notifications.scheduleNotificationAsync({
    identifier: TEST_NOTIFICATION_ID,
    content: {
      title: "Тест доставки уведомлений",
      body: "Доставка работает. Это проверочное уведомление; результат фоновой проверки сайтов придёт отдельно после запуска системой.",
      sound: "default",
      data: { kind: "delivery-test" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 15,
      repeats: false,
      ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
    },
  });
}

// Serialize startup, settings writes and registration changes across hook remounts.
let settingsQueue: Promise<unknown> = Promise.resolve();
function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const next = settingsQueue.then(operation);
  settingsQueue = next.catch(() => undefined);
  return next;
}

export function initializeMonitor(): Promise<MonitorSnapshot> {
  return serialize(async () => {
    const settings = await readMonitorSettings();
    try {
      const issue = await backgroundIssue();
      if (!issue) {
        await ensureChannel();
        await syncRegistration(settings);
        if (!settings.isTestEnabled) await Notifications.cancelScheduledNotificationAsync(TEST_NOTIFICATION_ID);
      }
    } catch (error) {
      // Keep saved switches visible so a failed registration can still be disabled/retried.
      const snapshot = await getMonitorSnapshot();
      return { ...snapshot, issue: monitorError(error) };
    }
    return getMonitorSnapshot();
  });
}

export function updateMonitorSettings(patch: Partial<MonitorSettings>): Promise<MonitorSnapshot> {
  return serialize(async () => {
    const previous = await readMonitorSettings();
    const next = { ...previous, ...patch };
    next.intervalMinutes = normalizeInterval(next.intervalMinutes);
    const enabling = (next.isEnabled && !previous.isEnabled) ||
      (next.isTestEnabled && !previous.isTestEnabled);
    const issue = await backgroundIssue();
    if (enabling && issue) throw new Error(issue);
    if (enabling) {
      const permissionIssue = await notificationIssue(true);
      if (permissionIssue) throw new Error(permissionIssue);
    }
    try {
      // Persist before registering so a worker always sees the current opt-in.
      await saveSettings(next);
      if (!issue) await syncRegistration(next);
      if (next.isTestEnabled && !previous.isTestEnabled) await scheduleDeliveryTest();
      if (!next.isTestEnabled && Platform.OS !== "web") {
        await Notifications.cancelScheduledNotificationAsync(TEST_NOTIFICATION_ID);
      }
    } catch (error) {
      await saveSettings(previous);
      if (!issue) await syncRegistration(previous);
      throw error;
    }
    return getMonitorSnapshot();
  });
}

export async function getMonitorSnapshot(): Promise<MonitorSnapshot> {
  const settings = await readMonitorSettings();
  let issue: string | null = null;
  let isRegistered = false;
  try {
    issue = await backgroundIssue();
    isRegistered = !issue && await TaskManager.isTaskRegisteredAsync(BACKGROUND_MONITOR_TASK);
    if (!issue) issue = await notificationIssue(false);
  } catch (error) {
    issue = monitorError(error);
  }
  const raw = await AsyncStorage.getItem(RUN_KEY);
  let lastRun: MonitorRun | null = null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.startedAt === "string" && typeof parsed.message === "string" &&
          ["running", "checked", "skipped", "error"].includes(parsed.status) &&
          ["none", "scheduled", "blocked"].includes(parsed.notification)) lastRun = parsed;
    } catch { /* Ignore an incomplete legacy record. */ }
  }
  return { settings, issue, isRegistered, lastRun };
}

async function saveRun(run: MonitorRun) {
  await AsyncStorage.setItem(RUN_KEY, JSON.stringify(run));
}

async function checkSites(): Promise<{ message: string; hasWhitelist?: boolean }> {
  console.info("[BackgroundMonitor] Reading network state");
  const network = await Network.getNetworkStateAsync();
  console.info("[BackgroundMonitor] Network state", JSON.stringify(network));
  const { isVpnActive } = await import("react-native-vpn-detector");
  if (isVpnActive()) return { message: "Проверка пропущена: отключите VPN." };
  if (network.type !== Network.NetworkStateType.CELLULAR || network.isConnected === false) {
    return { message: "Проверка пропущена: нужен мобильный интернет без Wi-Fi." };
  }
  // Do not trust isInternetReachable: its probe can itself be blocked by a whitelist.
  const results = await Promise.all([...NEUTRAL_SITES, ...CONTROL_SITES].map(pingSite));
  console.info("[BackgroundMonitor] Site probes completed");
  const accessible = results.slice(0, NEUTRAL_SITES.length).filter((r) => r.accessible).length;
  const controls = results.slice(NEUTRAL_SITES.length).filter((r) => r.accessible).length;
  const state = classifyConnectivity(accessible, controls);
  if (state === "offline") return { message: "Ни один контрольный сайт не доступен. Нельзя отличить белый список от отсутствия интернета." };
  return {
    hasWhitelist: state === "whitelist",
    message: state === "whitelist"
      ? "Возможен белый список: нейтральные сайты недоступны, контрольные российские сайты доступны."
      : `Нейтральные сайты доступны: ${accessible}/${NEUTRAL_SITES.length}. Белый список не обнаружен.`,
  };
}

export async function runBackgroundMonitor(taskError?: { message: string }) {
  const run: MonitorRun = {
    startedAt: new Date().toISOString(), status: "running",
    message: "Фоновая проверка началась.", notification: "none",
  };
  try {
    const settings = await readMonitorSettings();
    if (!settings.isEnabled && !settings.isTestEnabled) return BackgroundTask.BackgroundTaskResult.Success;
    console.info("[BackgroundMonitor] Started", run.startedAt);
    await saveRun(run);
    console.info("[BackgroundMonitor] Run record saved");
    if (taskError) throw new Error(taskError.message);
    const result = await checkSites();
    run.status = result.hasWhitelist === undefined ? "skipped" : "checked";
    run.message = result.message;
    // A check can finish after the user disables monitoring.
    const current = await readMonitorSettings();
    const previous = await AsyncStorage.getItem(STATE_KEY);
    const notify = current.isTestEnabled || (current.isEnabled && result.hasWhitelist !== undefined &&
      shouldNotify(previous, result.hasWhitelist, false));
    if (notify) {
      const issue = await notificationIssue(false);
      if (issue) {
        run.notification = "blocked";
        run.message += ` ${issue}`;
      } else {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: result.hasWhitelist === undefined ? "Фоновая проверка: пропуск"
              : result.hasWhitelist ? "Возможен белый список" : "Белый список не обнаружен",
            body: result.message,
            sound: "default",
            data: { kind: "background-check", startedAt: run.startedAt },
          },
          trigger: Platform.OS === "android" ? { channelId: CHANNEL_ID } : null,
        });
        run.notification = "scheduled";
        // Advance only after acceptance, so permission/scheduling failures retry next run.
        if (result.hasWhitelist !== undefined) await AsyncStorage.setItem(STATE_KEY, String(result.hasWhitelist));
      }
    }
    run.completedAt = new Date().toISOString();
    await saveRun(run);
    console.info("[BackgroundMonitor] Completed", JSON.stringify(run));
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    run.status = "error";
    run.message = monitorError(error);
    run.completedAt = new Date().toISOString();
    try { await saveRun(run); } catch (storageError) { console.error("[BackgroundMonitor] Diagnostics:", storageError); }
    console.error("[BackgroundMonitor]", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
}

if (Platform.OS !== "web" && !TaskManager.isTaskDefined(BACKGROUND_MONITOR_TASK)) {
  TaskManager.defineTask(BACKGROUND_MONITOR_TASK, ({ error }) => runBackgroundMonitor(error ?? undefined));
  console.info("[BackgroundMonitor] Task defined at JS startup");
}
