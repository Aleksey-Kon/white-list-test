import { AppRegistry, Platform } from "react-native";

// Paired with the SDK 54 TaskManager Android patch. Native code finishes each
// token AFTER notifyTaskFinishedAsync, or releases it after two minutes/on teardown.
// Resolving this promise here would immediately pause background timers again.
if (Platform.OS === "android") {
  AppRegistry.registerHeadlessTask("whitelist-task-manager-timers", () =>
    () => new Promise<void>(() => {}));
}
