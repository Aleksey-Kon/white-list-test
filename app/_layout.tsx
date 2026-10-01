import { Lato_400Regular } from "@expo-google-fonts/lato/400Regular";
import { Lato_700Bold } from "@expo-google-fonts/lato/700Bold";
import { Lato_900Black } from "@expo-google-fonts/lato/900Black";
import { useFonts } from "@expo-google-fonts/lato/useFonts";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useState } from "react";
import { AppState, View } from "react-native";
import "react-native-reanimated";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLocalization } from "@/hooks/useLocalization";
import { refreshSystemLanguage } from "@/utils/localization";
import { prepareApp } from "@/utils/prepareApp";
import { synchronizeNativeAppName } from "../utils/nativeAppName";

// Hold the native splash until preferences and the first themed frame are ready.
void SplashScreen.preventAutoHideAsync().catch((error) => console.warn("Could not hold splash screen:", error));

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Lato_400Regular,
    Lato_700Bold,
    Lato_900Black,
  });
  const colorScheme = useColorScheme();
  const { language, t } = useLocalization();
  const [ready, setReady] = useState(false);
  const backgroundColor = Colors[colorScheme].background;
  const navigationTheme = colorScheme === "dark" ? DarkTheme : DefaultTheme;

  useEffect(() => {
    let active = true;
    void prepareApp().then(() => { if (active) setReady(true); });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshSystemLanguage();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (ready) {
      void SystemUI.setBackgroundColorAsync(backgroundColor)
        .catch((error) => console.warn("Could not update root background:", error));
    }
  }, [backgroundColor, ready]);

  useEffect(() => {
    if (ready) {
      void synchronizeNativeAppName(language).catch((error) => {
        console.warn("Could not update native app name:", error);
      });
    }
  }, [language, ready]);

  if (!ready || (!fontsLoaded && !fontError)) return null;

  return (
    <View
      style={{ flex: 1, backgroundColor }}
      onLayout={() => {
        void SplashScreen.hideAsync().catch((error) => console.warn("Could not hide splash screen:", error));
      }}
    >
      <ThemeProvider value={{ ...navigationTheme, colors: { ...navigationTheme.colors, background: backgroundColor } }}>
        <Stack screenOptions={{ contentStyle: { backgroundColor } }}>
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
    </View>
  );
}
