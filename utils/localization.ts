import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';

export type Language = 'ru' | 'en';
export const LANGUAGE_STORAGE_KEY = 'app-language';

export function languageFromLocale(locale?: string | null): Language {
  return locale?.toLowerCase().split(/[-_]/)[0] === 'ru' ? 'ru' : 'en';
}

export function getSystemLanguage(): Language {
  try {
    return languageFromLocale(getLocales()[0]?.languageCode);
  } catch {
    return 'en';
  }
}

let language = getSystemLanguage();
let hasOverride = false;
let revision = 0;
let initialization: Promise<void> | undefined;
let writes: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();

export const getLanguage = () => language;

export function subscribeLanguage(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function publish(next: Language) {
  if (language === next) return;
  language = next;
  listeners.forEach((listener) => listener());
}

export function refreshSystemLanguage() {
  if (!hasOverride) publish(getSystemLanguage());
}

export function initializeLanguage(): Promise<void> {
  if (!initialization) {
    const initialRevision = revision;
    initialization = AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((saved) => {
      if (initialRevision !== revision) return;
      if (saved === 'ru' || saved === 'en') {
        hasOverride = true;
        publish(saved);
      } else {
        refreshSystemLanguage();
      }
    }).catch((error) => {
      console.warn('Could not load language preference:', error);
    });
  }
  return initialization;
}

export function setLanguage(next: Language): Promise<void> {
  revision += 1;
  hasOverride = true;
  publish(next);
  const write = writes.then(() => AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, next));
  writes = write.catch(() => undefined);
  return write;
}
