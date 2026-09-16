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
  "https://sberbank.ru",
  "https://tbank.ru",
  "https://vtb.ru",
  "https://rbc.ru",
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
  noInternet: boolean;
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
async function requestSite(url: string, method: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT);
  try {
    return await fetch(url, {
      method, signal: controller.signal, cache: "no-store", redirect: "follow",
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function pingSite(url: string): Promise<SiteResult> {
  const startTime = Date.now();
  const attempts = [
    { url: getPingUrl(url), method: "GET" },
    { url, method: "HEAD" },
    { url, method: "GET" },
  ];
  for (const attempt of attempts) {
    try {
      const response = await requestSite(attempt.url, attempt.method);
      return {
        url,
        // An HTTP response (including a missing favicon) proves reachability.
        accessible: response.status > 0 && response.status < 500,
        responseTime: Date.now() - startTime,
      };
    } catch {
      // Each attempt owns its timeout and releases it even after a network error.
    }
  }
  return { url, accessible: false, responseTime: Date.now() - startTime };
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

  // Определяем отсутствие интернета: если 0 из всех сайтов доступны
  const totalAccessible = [
    ...whitelistResults,
    ...russianResults,
    ...neutralResults,
  ].filter((r) => r.accessible).length;
  const noInternet = totalAccessible === 0;

  return {
    whitelistResults,
    russianResults,
    neutralResults,
    hasWhitelist,
    noInternet,
    timestamp: new Date(),
  };
}
