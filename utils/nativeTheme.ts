import { requireOptionalNativeModule } from 'expo';
import { Appearance, Platform } from 'react-native';
import type { AppTheme } from './themePreference';

const nativeTheme = Platform.OS === 'android'
  ? requireOptionalNativeModule<{ setTheme(theme: AppTheme): Promise<void> }>('AppTheme')
  : null;

export async function synchronizeNativeTheme(theme: AppTheme): Promise<void> {
  if (nativeTheme) {
    await nativeTheme.setTheme(theme);
  } else if (Platform.OS !== 'web') {
    // Also updates native dialogs on iOS and keeps older development builds usable.
    Appearance.setColorScheme(theme);
  }
}
