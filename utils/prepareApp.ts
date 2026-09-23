import { Appearance } from 'react-native';
import { setBackgroundColorAsync } from 'expo-system-ui';
import { Colors } from '../constants/theme';
import { initializeLanguage } from './localization';
import { getThemePreference, initializeTheme, resolveTheme } from './themePreference';

export async function prepareApp() {
  await Promise.all([initializeLanguage(), initializeTheme()]);
  const theme = resolveTheme(getThemePreference(), Appearance.getColorScheme());
  await setBackgroundColorAsync(Colors[theme].background).catch((error) => {
    console.warn('Could not set startup background:', error);
  });
}
