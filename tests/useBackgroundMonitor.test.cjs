const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTypescript } = require('./loadTypescript.cjs');

function setup() {
  const states = [];
  const cleanups = [];
  let listener;
  let removed = false;
  let registered = false;
  let calls = 0;
  const service = {
    initializeMonitor: async () => {
      calls++;
      registered = true;
      return { settings: { isEnabled: true, isTestEnabled: false, intervalMinutes: 15 },
        isRegistered: registered, issue: null, lastRun: null };
    },
    monitorError: (error) => error.message,
  };
  const { useBackgroundMonitor } = loadTypescript('hooks/useBackgroundMonitor.ts', {
    react: {
      useRef: (value) => ({ current: value }),
      useCallback: (callback) => callback,
      useState: (value) => {
        const index = states.length;
        states.push(value);
        return [value, (next) => { states[index] = next; }];
      },
      useEffect: (effect) => cleanups.push(effect()),
    },
    'react-native': { AppState: { addEventListener: (_name, callback) => {
      listener = callback;
      return { remove: () => { removed = true; } };
    } } },
    '@/services/backgroundMonitor': service,
  });
  useBackgroundMonitor();
  return { states, service, emit: (state) => listener(state),
    loseRegistration: () => { registered = false; },
    isRegistered: () => registered, calls: () => calls, removed: () => removed,
    unmount: () => cleanups.forEach((cleanup) => cleanup()),
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

test('returning to the foreground repairs a lost registration instead of only reading status', async () => {
  const h = setup();
  await flush();
  h.loseRegistration();
  h.emit('background');
  await flush();
  assert.equal(h.isRegistered(), false);
  h.emit('active');
  await flush();
  assert.equal(h.isRegistered(), true);
  assert.equal(h.calls(), 2);
  assert.equal(h.states[0].isRegistered, true);
  h.unmount();
  assert.equal(h.removed(), true);
});

test('unmount during foreground repair removes the listener and ignores a late result', async () => {
  const h = setup();
  await flush();
  const snapshot = h.states[0];
  let finish;
  h.service.initializeMonitor = () => new Promise((resolve) => { finish = resolve; });
  h.emit('active');
  h.unmount();
  finish({ ...snapshot, issue: 'late result' });
  await flush();
  assert.equal(h.states[0], snapshot);
  assert.equal(h.removed(), true);
});
