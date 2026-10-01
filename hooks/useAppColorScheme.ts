import { useSyncExternalStore } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { getThemePreference, resolveTheme, subscribeTheme } from '@/utils/themePreference';

export function useAppColorScheme() {
  const preference = useSyncExternalStore(subscribeTheme, getThemePreference, () => null);
  const systemTheme = useSystemColorScheme();
  return resolveTheme(preference, systemTheme);
}
