import { setBackgroundColorAsync } from "expo-system-ui";
import { Appearance } from "react-native";
import { Colors } from "../constants/theme";
import { getLanguage, initializeLanguage } from "./localization";
import { synchronizeNativeAppName } from "./nativeAppName";
import {
    getThemePreference,
    initializeTheme,
    resolveTheme,
} from "./themePreference";

export async function prepareApp() {
  await Promise.all([initializeLanguage(), initializeTheme()]);
  await synchronizeNativeAppName(getLanguage()).catch((error) => {
    console.warn("Could not update native app name:", error);
  });
  const theme = resolveTheme(getThemePreference(), Appearance.getColorScheme());
  await setBackgroundColorAsync(Colors[theme].background).catch((error) => {
    console.warn("Could not set startup background:", error);
  });
}
