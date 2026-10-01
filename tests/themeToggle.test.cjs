const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTypescript } = require('./loadTypescript.cjs');

function setup(options = {}) {
  const states = [];
  const cleanups = [];
  const animations = [];
  const selectedThemes = [];
  const { useThemeToggle } = loadTypescript('hooks/useThemeToggle.ts', {
    react: {
      useRef: (value) => ({ current: value }),
      useState: (initial) => {
        const index = states.length;
        states.push(typeof initial === 'function' ? initial() : initial);
        return [states[index], (value) => { states[index] = value; }];
      },
      useEffect: (effect) => { cleanups.push(effect()); },
    },
    'react-native': {
      Platform: { OS: options.os ?? 'android' },
      AccessibilityInfo: { isReduceMotionEnabled: options.reduceMotion ?? (async () => false) },
      Easing: { cubic: 'cubic', inOut: (value) => value },
      Animated: {
        Value: class {
          constructor(value) { this.value = value; }
          setValue(value) { this.value = value; }
        },
        timing: (_value, config) => {
          const animation = { config, callback: null, stopped: false,
            start(callback) { this.callback = callback; },
            stop() { this.stopped = true; this.callback?.({ finished: false }); },
          };
          animations.push(animation);
          return animation;
        },
      },
    },
    '@/hooks/use-color-scheme': { useColorScheme: () => options.theme ?? 'light' },
    '@/utils/themePreference': { setTheme: async (value) => { selectedThemes.push(value); } },
  });
  return { hook: useThemeToggle(), states, animations, selectedThemes,
    unmount: () => cleanups.forEach((cleanup) => cleanup()),
  };
}

test('theme and icon state change only after rotation finishes; duplicate presses are ignored', async () => {
  const h = setup();
  await Promise.all([h.hook.toggleTheme(), h.hook.toggleTheme()]);
  assert.equal(h.animations.length, 1);
  assert.equal(h.states[1], true);
  assert.deepEqual(h.selectedThemes, []);
  assert.equal(h.animations[0].config.useNativeDriver, true);
  h.animations[0].callback({ finished: true });
  assert.deepEqual(h.selectedThemes, ['dark']);
  assert.equal(h.states[1], false);
  assert.equal(h.hook.rotation.value, 0);
});

test('dark mode switches back to light and web uses the JS animation driver', async () => {
  const h = setup({ theme: 'dark', os: 'web' });
  await h.hook.toggleTheme();
  assert.equal(h.animations[0].config.useNativeDriver, false);
  h.animations[0].callback({ finished: true });
  assert.deepEqual(h.selectedThemes, ['light']);
});

test('reduced motion changes the theme without starting an animation', async () => {
  const h = setup({ reduceMotion: async () => true });
  await h.hook.toggleTheme();
  assert.equal(h.animations.length, 0);
  assert.deepEqual(h.selectedThemes, ['dark']);
  assert.equal(h.states[1], false);
});

test('unmount stops rotation and prevents a late theme change', async () => {
  const h = setup();
  await h.hook.toggleTheme();
  h.unmount();
  assert.equal(h.animations[0].stopped, true);
  h.animations[0].callback({ finished: true });
  assert.deepEqual(h.selectedThemes, []);
});

test('unmount while checking reduced motion never starts a late animation', async () => {
  let resolve;
  const h = setup({ reduceMotion: () => new Promise((done) => { resolve = done; }) });
  const pending = h.hook.toggleTheme();
  h.unmount();
  resolve(false);
  await pending;
  assert.equal(h.animations.length, 0);
  assert.deepEqual(h.selectedThemes, []);
});

test('interrupted rotation leaves the theme unchanged and permits retry', async () => {
  const h = setup();
  await h.hook.toggleTheme();
  h.animations[0].callback({ finished: false });
  assert.deepEqual(h.selectedThemes, []);
  assert.equal(h.states[1], false);
  await h.hook.toggleTheme();
  assert.equal(h.animations.length, 2);
});
