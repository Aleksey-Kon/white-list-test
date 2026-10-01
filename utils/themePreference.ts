import AsyncStorage from '@react-native-async-storage/async-storage';
import { synchronizeNativeTheme } from './nativeTheme';

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

async function synchronizeTheme(next: AppTheme) {
  try {
    await synchronizeNativeTheme(next);
  } catch (error) {
    console.warn('Could not synchronize native theme:', error);
  }
}

export function initializeTheme(): Promise<void> {
  if (!initialization) {
    const initialRevision = revision;
    initialization = AsyncStorage.getItem(THEME_STORAGE_KEY).then(async (saved) => {
      if (initialRevision === revision && (saved === 'light' || saved === 'dark')) {
        publish(saved);
        const sync = writes.then(() => {
          if (initialRevision === revision) return synchronizeTheme(saved);
        });
        writes = sync.catch(() => undefined);
        await sync;
      }
    }).catch((error) => {
      console.warn('Could not load theme preference:', error);
    });
  }
  return initialization;
}

export function setTheme(next: AppTheme): Promise<void> {
  revision += 1;
  publish(next);
  const write = writes.then(async () => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, next);
    await synchronizeTheme(next);
  });
  writes = write.catch(() => undefined);
  return write;
}
