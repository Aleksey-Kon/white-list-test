const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTypescript } = require('./loadTypescript.cjs');
const { main } = require('../package.json');

test('headless entry initializes background tasks before registering Router without mounting a screen', () => {
  const loaded = [];
  // Observe imports at module evaluation, as happens when TaskService starts JS without an Activity.
  const mocks = {};
  Object.defineProperty(mocks, './services/backgroundTimerTask', {
    get() { loaded.push('timers'); return {}; },
  });
  Object.defineProperty(mocks, './services/backgroundMonitor', {
    get() { loaded.push('task'); return {}; },
  });
  Object.defineProperty(mocks, 'expo-router/entry', {
    get() { loaded.push('router'); return {}; },
  });
  loadTypescript(main, mocks);
  assert.deepEqual(loaded, ['timers', 'task', 'router']);
});
