import AsyncStorage from "@react-native-async-storage/async-storage";

export const CUSTOM_SITES_STORAGE_KEY = "custom-test-sites";

function normalizeSiteUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export async function loadCustomSites(): Promise<string[]> {
  try {
    const stored = await AsyncStorage.getItem(CUSTOM_SITES_STORAGE_KEY);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((site): site is string => typeof site === "string")
      .map(normalizeSiteUrl)
      .filter((site): site is string => site !== null)
      .filter((site, index, sites) => sites.indexOf(site) === index);
  } catch {
    return [];
  }
}

export async function saveCustomSites(sites: string[]): Promise<void> {
  await AsyncStorage.setItem(CUSTOM_SITES_STORAGE_KEY, JSON.stringify(sites));
}

export function normalizeCustomSite(value: string): string | null {
  return normalizeSiteUrl(value);
}
