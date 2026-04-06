// Списки сайтов для тестирования
export const WHITELIST_RU_SITES = [
  "https://vk.com",
  "https://ok.ru",
  "https://yandex.ru",
  "https://yandex.ru/maps",
  "https://2gis.ru",
  "https://mail.ru",
  "https://rutube.ru",
  "https://avito.ru",
  "https://wildberries.ru",
  "https://ozon.ru",
  "https://gosuslugi.ru",
  "https://sberbank.ru",
  "https://tbank.ru",
  "https://vtb.ru",
  "https://rbc.ru",
  "https://ria.ru",
  "https://lenta.ru",
];

export const RUSSIAN_SITES = [
  "https://habr.com",
  "https://tproger.ru",
  "https://citilink.ru",
  "https://dns-shop.ru",
  "https://mvideo.ru",
  "https://lamoda.ru",
  "https://drom.ru",
  "https://auto.ru",
  "https://stepik.org",
  "https://skillbox.ru",
  "https://kommersant.ru",
  "https://vedomosti.ru",
];

export const NEUTRAL_SITES = [
  "https://github.com",
  "https://gitlab.com",
  "https://stackoverflow.com",
  "https://python.org",
  "https://developer.mozilla.org",
  "https://linux.org",
  "https://kernel.org",
  "https://ubuntu.com",
  "https://archlinux.org",
  "https://reactjs.org",
  "https://nodejs.org",
  "https://google.com",
  "https://amazon.com",
  "https://vercel.com",
];

export interface SiteResult {
  url: string;
  accessible: boolean;
  responseTime?: number;
}

export interface TestResult {
  whitelistResults: SiteResult[];
  russianResults: SiteResult[];
  neutralResults: SiteResult[];
  hasWhitelist: boolean;
  timestamp: Date;
}

const PING_TIMEOUT = 5000; // 5 секунд

/**
 * Проверяет доступность сайта через HTTP запрос
 */
export async function pingSite(url: string): Promise<SiteResult> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT);

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    return {
      url,
      accessible:
        response.ok || response.status === 301 || response.status === 302,
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return {
      url,
      accessible: false,
      responseTime,
    };
  }
}

/**
 * Запускает полный тест всех сайтов
 */
export async function runFullTest(): Promise<TestResult> {
  // Проверяем все сайты параллельно
  const allUrls = [...WHITELIST_RU_SITES, ...RUSSIAN_SITES, ...NEUTRAL_SITES];

  const results = await Promise.all(allUrls.map(pingSite));

  const whitelistResults = results.slice(0, WHITELIST_RU_SITES.length);
  const russianResults = results.slice(
    WHITELIST_RU_SITES.length,
    WHITELIST_RU_SITES.length + RUSSIAN_SITES.length,
  );
  const neutralResults = results.slice(
    WHITELIST_RU_SITES.length + RUSSIAN_SITES.length,
  );

  // Определяем наличие белого списка
  // Если больше 7 из 10 нейтральных сайтов недоступны = есть белые списки
  const neutralInaccessible = neutralResults.filter(
    (r) => !r.accessible,
  ).length;
  const hasWhitelist = neutralInaccessible > 7;

  return {
    whitelistResults,
    russianResults,
    neutralResults,
    hasWhitelist,
    timestamp: new Date(),
  };
}
