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
  "https://2ip.io",
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
 * Преобразует URL домена в URL для "ping" проверки (favicon)
 */
function getPingUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Пытаемся загрузить favicon — это маленький и быстрый запрос
    return `${urlObj.origin}/favicon.ico`;
  } catch {
    return url;
  }
}

/**
 * Проверяет доступность сайта через "ping" запрос (загрузка favicon)
 * Если favicon недоступен, fallback на обычный HTTP запрос
 */
export async function pingSite(url: string): Promise<SiteResult> {
  const startTime = Date.now();
  const pingUrl = getPingUrl(url);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT);

    // Пробуем загрузить favicon (как ping)
    let response: Response;
    try {
      response = await fetch(pingUrl, {
        method: "GET",
        signal: controller.signal,
        cache: "no-store",
        redirect: "follow",
      });
    } catch {
      // Если favicon не загрузился, пробуем HEAD запрос к основному URL
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), PING_TIMEOUT);

      try {
        response = await fetch(url, {
          method: "HEAD",
          signal: controller2.signal,
          cache: "no-store",
          redirect: "follow",
        });
      } catch {
        // Если HEAD не сработал, пробуем GET
        const controller3 = new AbortController();
        const timeoutId3 = setTimeout(() => controller3.abort(), PING_TIMEOUT);

        response = await fetch(url, {
          method: "GET",
          signal: controller3.signal,
          cache: "no-store",
          redirect: "follow",
        });

        clearTimeout(timeoutId3);
      }

      clearTimeout(timeoutId2);
    }

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    // Для favicon даже 404 означает что сервер доступен (просто нет файла)
    const isPingCheck = pingUrl.includes("/favicon.ico");
    const isAccessible = isPingCheck
      ? response.status < 500 // Любые ответы кроме серверных ошибок = доступен
      : response.ok || response.status === 301 || response.status === 302;

    return {
      url,
      accessible: isAccessible,
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
  // Если больше 70% нейтральных сайтов недоступны = есть белые списки
  const neutralInaccessible = neutralResults.filter(
    (r) => !r.accessible,
  ).length;
  const inaccessiblePercent = neutralInaccessible / neutralResults.length;
  const hasWhitelist = inaccessiblePercent > 0.7;

  return {
    whitelistResults,
    russianResults,
    neutralResults,
    hasWhitelist,
    timestamp: new Date(),
  };
}
