/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

export const Colors = {
  light: {
    text: "#17202A",
    background: "#F5F7FB",
    tint: tintColorLight,
    icon: "#647184",
    tabIconDefault: "#647184",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#E8EEF7",
    background: "#10151C",
    tint: tintColorDark,
    icon: "#A8B5C7",
    tabIconDefault: "#A8B5C7",
    tabIconSelected: tintColorDark,
    surface: "#19222E",
    surfaceRaised: "#243142",
    surfaceInset: "#141D28",
    border: "#344357",
    inputBorder: "#53677F",
    success: "#7DDCB0",
    error: "#FF9B9B",
    warning: "#F6D28B",
    successSurface: "#173B30",
    errorSurface: "#44282F",
    neutralSurface: "#2B3544",
    warningSurface: "#352C1E",
    warningBorder: "#705A31",
    link: "#7CD4F0",
    button: "#146EAD",
    buttonDisabled: "#29455E",
    secondaryButton: "#1D718D",
    controlTrack: "#52637A",
    controlActive: "#318657",
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "sans-serif",
    serif: "serif",
    rounded: "sans-serif-medium",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
