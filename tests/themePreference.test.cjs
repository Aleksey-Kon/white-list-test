const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTypescript } = require('./loadTypescript.cjs');

function setup(options = {}) {
  const storage = new Map(Object.entries(options.storage ?? {}));
  const theme = loadTypescript('utils/themePreference.ts', {
    '@react-native-async-storage/async-storage': {
      getItem: options.getItem ?? (async (key) => storage.get(key) ?? null),
      setItem: options.setItem ?? (async (key, value) => { storage.set(key, value); }),
    },
  });
  return { theme, storage };
}

test('theme follows the system until a valid preference is saved', async () => {
  const { theme } = setup({ storage: { 'app-theme': 'invalid' } });
  await theme.initializeTheme();
  assert.equal(theme.getThemePreference(), null);
  assert.equal(theme.resolveTheme(null, 'dark'), 'dark');
  assert.equal(theme.resolveTheme(null, 'light'), 'light');
  assert.equal(theme.resolveTheme(null, null), 'light');
  assert.equal(theme.resolveTheme('light', 'dark'), 'light');
  assert.equal(theme.resolveTheme('dark', 'light'), 'dark');
});

test('manual theme selection is restored on restart', async () => {
  const h = setup();
  await h.theme.setTheme('dark');
  const restarted = setup({ storage: Object.fromEntries(h.storage) });
  await restarted.theme.initializeTheme();
  assert.equal(restarted.theme.getThemePreference(), 'dark');
});

test('late loading cannot overwrite a new theme selection', async () => {
  let resolve;
  const { theme } = setup({ getItem: () => new Promise((done) => { resolve = done; }) });
  const loading = theme.initializeTheme();
  await theme.setTheme('light');
  resolve('dark');
  await loading;
  assert.equal(theme.getThemePreference(), 'light');
});

test('theme writes stay ordered and subscriptions stop notifying after cleanup', async () => {
  const pending = [];
  const { theme } = setup({ setItem: (_key, value) => new Promise((resolve) => pending.push({ value, resolve })) });
  let notifications = 0;
  const unsubscribe = theme.subscribeTheme(() => { notifications += 1; });
  const first = theme.setTheme('dark');
  const second = theme.setTheme('light');
  await Promise.resolve();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].value, 'dark');
  pending[0].resolve();
  await first;
  await Promise.resolve();
  assert.equal(pending[1].value, 'light');
  pending[1].resolve();
  await second;
  assert.equal(notifications, 2);
  unsubscribe();
  const third = theme.setTheme('dark');
  await Promise.resolve();
  pending[2].resolve();
  await third;
  assert.equal(notifications, 2);
});

test('failed persistence does not prevent the next theme change', async () => {
  let attempts = 0;
  const { theme } = setup({ setItem: async () => { if (++attempts === 1) throw new Error('storage failed'); } });
  await assert.rejects(theme.setTheme('dark'), /storage failed/);
  await theme.setTheme('light');
  assert.equal(theme.getThemePreference(), 'light');
});

test('failed preference loading leaves the system default available', async (t) => {
  t.mock.method(console, 'warn', () => {});
  const { theme } = setup({ getItem: async () => { throw new Error('storage failed'); } });
  await theme.initializeTheme();
  assert.equal(theme.getThemePreference(), null);
});
