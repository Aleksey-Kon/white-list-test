const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTypescript } = require('./loadTypescript.cjs');

test('Android sends the selected theme to the persistent native bridge', async () => {
  const selected = [];
  const { synchronizeNativeTheme } = loadTypescript('utils/nativeTheme.ts', {
    expo: { requireOptionalNativeModule: (name) => {
      assert.equal(name, 'AppTheme');
      return { setTheme: async (theme) => { selected.push(theme); } };
    } },
    'react-native': { Platform: { OS: 'android' }, Appearance: { setColorScheme: () => assert.fail('should use native bridge') } },
  });
  await synchronizeNativeTheme('dark');
  await synchronizeNativeTheme('light');
  assert.deepEqual(selected, ['dark', 'light']);
});

for (const os of ['android', 'ios', 'web']) {
  test(`${os} handles unavailable native theme bridge`, async () => {
    const selected = [];
    const { synchronizeNativeTheme } = loadTypescript('utils/nativeTheme.ts', {
      expo: { requireOptionalNativeModule: () => {
        assert.equal(os, 'android');
        return null;
      } },
      'react-native': { Platform: { OS: os }, Appearance: { setColorScheme: (theme) => selected.push(theme) } },
    });
    await synchronizeNativeTheme('dark');
    assert.deepEqual(selected, os === 'web' ? [] : ['dark']);
  });
}

for (const saved of ['dark', 'light', null]) {
  test(`startup waits for the saved ${saved} theme and root background before showing content`, async () => {
    const calls = [];
    let finishTheme;
    let finishBackground;
    const { prepareApp } = loadTypescript('utils/prepareApp.ts', {
      'react-native': { Appearance: { getColorScheme: () => 'light' } },
      'expo-system-ui': { setBackgroundColorAsync: (color) => {
        calls.push(color);
        return new Promise((resolve) => { finishBackground = resolve; });
      } },
      '../constants/theme': { Colors: { dark: { background: '#10151C' }, light: { background: '#F5F7FB' } } },
      './localization': { initializeLanguage: async () => {} },
      './themePreference': {
        initializeTheme: () => new Promise((resolve) => { finishTheme = resolve; }),
        getThemePreference: () => saved,
        resolveTheme: (preference, system) => preference ?? system,
      },
    });
    let ready = false;
    const preparing = prepareApp().then(() => { ready = true; });
    assert.deepEqual(calls, []);
    finishTheme();
    await Promise.resolve();
    await Promise.resolve();
    assert.deepEqual(calls, [saved === 'dark' ? '#10151C' : '#F5F7FB']);
    assert.equal(ready, false);
    finishBackground();
    await preparing;
    assert.equal(ready, true);
  });
}

test('native splash colors match the actual light and dark app backgrounds', () => {
  const config = require('../app.json').expo;
  const splash = config.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen')[1];
  const { Colors } = loadTypescript('constants/theme.ts', { 'react-native': { Platform: { select: () => ({}) } } });
  assert.equal(splash.backgroundColor, Colors.light.background);
  assert.equal(splash.dark.backgroundColor, Colors.dark.background);
});
