import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLocalization } from "@/hooks/useLocalization";
import { initializeLanguage, refreshSystemLanguage } from "@/utils/localization";
import { initializeTheme } from "@/utils/themePreference";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { t } = useLocalization();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([initializeLanguage(), initializeTheme()]).then(() => { if (active) setReady(true); });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshSystemLanguage();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  if (!ready) return null;

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
            title: t("appTitle"),
          }}
        />
      </Stack>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}
