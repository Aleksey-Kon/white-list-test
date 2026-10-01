import { requireOptionalNativeModule } from "expo";
import type { Language } from "./localization";

const nativeAppName = requireOptionalNativeModule<{
  setAppLanguage(language: Language): Promise<void>;
}>("AppTheme");

export function synchronizeNativeAppName(language: Language): Promise<void> {
  return nativeAppName?.setAppLanguage(language) ?? Promise.resolve();
}
