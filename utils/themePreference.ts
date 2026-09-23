import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppTheme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'app-theme';

let preference: AppTheme | null = null;
let revision = 0;
let initialization: Promise<void> | undefined;
let writes: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();

export const getThemePreference = () => preference;

export function resolveTheme(saved: AppTheme | null, system: string | null | undefined): AppTheme {
  return saved ?? (system === 'dark' ? 'dark' : 'light');
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function publish(next: AppTheme) {
  if (preference === next) return;
  preference = next;
  listeners.forEach((listener) => listener());
}

export function initializeTheme(): Promise<void> {
  if (!initialization) {
    const initialRevision = revision;
    initialization = AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (initialRevision === revision && (saved === 'light' || saved === 'dark')) publish(saved);
    }).catch((error) => {
      console.warn('Could not load theme preference:', error);
    });
  }
  return initialization;
}

export function setTheme(next: AppTheme): Promise<void> {
  revision += 1;
  publish(next);
  const write = writes.then(() => AsyncStorage.setItem(THEME_STORAGE_KEY, next));
  writes = write.catch(() => undefined);
  return write;
}
