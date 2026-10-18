import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

const nativeMonitor = Platform.OS === "android"
  ? requireOptionalNativeModule<{
      configure(enabled: boolean, minutes: number, title: string, body: string, channelName: string): Promise<void>;
      isRunning(): Promise<boolean>;
    }>("BackgroundMonitor")
  : null;

export function isNativeMonitorAvailable(): boolean {
  return Platform.OS !== "android" || nativeMonitor !== null;
}

export async function configureNativeMonitor(
  enabled: boolean, minutes: number, title: string, body: string, channelName: string,
): Promise<void> {
  if (Platform.OS !== "android") return;
  if (!nativeMonitor) {
    if (enabled) throw new Error("backgroundServiceUnavailable");
    return;
  }
  await nativeMonitor.configure(enabled, minutes, title, body, channelName);
}

export async function isNativeMonitorRunning(): Promise<boolean> {
  return Platform.OS !== "android" || (await nativeMonitor?.isRunning()) === true;
}
