import { useCallback, useSyncExternalStore } from 'react';
import { getLanguage, subscribeLanguage } from '@/utils/localization';
import { translate, TranslationKey, TranslationParams } from '@/utils/translations';

export function useLocalization() {
  const language = useSyncExternalStore(subscribeLanguage, getLanguage, () => 'en' as const);
  const t = useCallback((key: TranslationKey, params?: TranslationParams) =>
    translate(language, key, params), [language]);
  return { language, locale: language === 'ru' ? 'ru-RU' : 'en-US', t };
}
