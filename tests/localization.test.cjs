const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTypescript } = require('./loadTypescript.cjs');

function setup(options = {}) {
  const storage = new Map(Object.entries(options.storage ?? {}));
  let locale = options.locale ?? 'en';
  const localization = loadTypescript('utils/localization.ts', {
    'expo-localization': { getLocales: () => [{ languageCode: locale }] },
    '@react-native-async-storage/async-storage': {
      getItem: options.getItem ?? (async (key) => storage.get(key) ?? null),
      setItem: options.setItem ?? (async (key, value) => { storage.set(key, value); }),
    },
  });
  return { localization, storage, changeLocale: (next) => { locale = next; } };
}

test('only a primary Russian locale defaults to Russian', () => {
  const { languageFromLocale } = setup().localization;
  for (const locale of ['ru', 'ru-RU', 'ru_BY', 'RU-kz']) assert.equal(languageFromLocale(locale), 'ru');
  for (const locale of ['en-US', 'de', 'uk', 'fr', '', null, undefined, 'russian']) {
    assert.equal(languageFromLocale(locale), 'en');
  }
  assert.equal(setup({ locale: 'ru' }).localization.getLanguage(), 'ru');
  assert.equal(setup({ locale: 'de' }).localization.getLanguage(), 'en');
});

test('saved language overrides the system and survives a fresh app launch', async () => {
  const h = setup({ locale: 'ru' });
  await h.localization.initializeLanguage();
  await h.localization.setLanguage('en');
  const restarted = setup({ locale: 'ru', storage: Object.fromEntries(h.storage) });
  await restarted.localization.initializeLanguage();
  assert.equal(restarted.localization.getLanguage(), 'en');
});

test('invalid stored preference falls back to the system', async () => {
  const h = setup({ locale: 'ru', storage: { 'app-language': 'fr' } });
  await h.localization.initializeLanguage();
  assert.equal(h.localization.getLanguage(), 'ru');
});

test('system changes apply only until the user selects a language', async () => {
  const h = setup();
  await h.localization.initializeLanguage();
  h.changeLocale('ru');
  h.localization.refreshSystemLanguage();
  assert.equal(h.localization.getLanguage(), 'ru');
  await h.localization.setLanguage('ru');
  h.changeLocale('en');
  h.localization.refreshSystemLanguage();
  assert.equal(h.localization.getLanguage(), 'ru');
});

test('late preference loading never replaces a newer user selection', async () => {
  let resolve;
  const h = setup({ getItem: () => new Promise((done) => { resolve = done; }) });
  const loading = h.localization.initializeLanguage();
  await h.localization.setLanguage('en');
  resolve('ru');
  await loading;
  assert.equal(h.localization.getLanguage(), 'en');
});

test('rapid switches serialize writes and notify only subscribed listeners', async () => {
  const pending = [];
  const h = setup({ setItem: (_key, value) => new Promise((resolve) => pending.push({ value, resolve })) });
  let notifications = 0;
  const unsubscribe = h.localization.subscribeLanguage(() => { notifications += 1; });
  const first = h.localization.setLanguage('ru');
  const second = h.localization.setLanguage('en');
  await Promise.resolve();
  assert.equal(h.localization.getLanguage(), 'en');
  assert.equal(pending.length, 1);
  assert.equal(pending[0].value, 'ru');
  pending[0].resolve();
  await first;
  await Promise.resolve();
  assert.equal(pending[1].value, 'en');
  pending[1].resolve();
  await second;
  assert.equal(notifications, 2);
  unsubscribe();
  const third = h.localization.setLanguage('ru');
  await Promise.resolve();
  pending[2].resolve();
  await third;
  assert.equal(notifications, 2);
});

test('a failed persistence write does not block later language changes', async () => {
  let attempts = 0;
  const h = setup({ setItem: async () => { if (++attempts === 1) throw new Error('storage failed'); } });
  await assert.rejects(h.localization.setLanguage('ru'), /storage failed/);
  await h.localization.setLanguage('en');
  assert.equal(h.localization.getLanguage(), 'en');
  assert.equal(attempts, 2);
});

test('both dictionaries cover the same keys and interpolation parameters', () => {
  const { translations, translate, translateDiagnostic } = loadTypescript('utils/translations.ts');
  assert.deepEqual(Object.keys(translations.ru).sort(), Object.keys(translations.en).sort());
  for (const key of Object.keys(translations.en)) {
    assert.deepEqual(translations.ru[key].match(/\{\w+\}/g), translations.en[key].match(/\{\w+\}/g), key);
    assert.ok(translations.ru[key].length && translations.en[key].length);
  }
  assert.equal(translate('en', 'minutes', { count: 15 }), '15 min.');
  assert.equal(translate('ru', 'minutes', { count: 15 }), '15 мин.');
  assert.equal(translateDiagnostic('en', 'notificationsDenied'), translations.en.notificationsDenied);
  assert.equal(translateDiagnostic('en', translations.ru.vpnSkipped), translations.en.vpnSkipped);
  assert.equal(translateDiagnostic('ru', 'native error'), 'native error');
});
