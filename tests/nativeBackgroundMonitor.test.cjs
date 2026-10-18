const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTypescript } = require('./loadTypescript.cjs');

function setup(os, native) {
  return loadTypescript('utils/nativeBackgroundMonitor.ts', {
    expo: { requireOptionalNativeModule: (name) => {
      assert.equal(os, 'android');
      assert.equal(name, 'BackgroundMonitor');
      return native;
    } },
    'react-native': { Platform: { OS: os } },
  });
}

test('Android forwards the opt-in, interval and localized ongoing notification to native', async () => {
  const calls = [];
  const bridge = setup('android', {
    configure: async (...args) => calls.push(args), isRunning: async () => true,
  });
  await bridge.configureNativeMonitor(true, 15, 'title', 'body', 'channel');
  assert.deepEqual(calls, [[true, 15, 'title', 'body', 'channel']]);
  assert.equal(bridge.isNativeMonitorAvailable(), true);
  assert.equal(await bridge.isNativeMonitorRunning(), true);
});

test('an old Android build reports its missing module and still permits disabling', async () => {
  const bridge = setup('android', null);
  assert.equal(bridge.isNativeMonitorAvailable(), false);
  assert.equal(await bridge.isNativeMonitorRunning(), false);
  await bridge.configureNativeMonitor(false, 15, '', '', '');
  await assert.rejects(bridge.configureNativeMonitor(true, 15, '', '', ''), /backgroundServiceUnavailable/);
});

for (const os of ['ios', 'web']) {
  test(`${os} does not load or start an Android foreground service`, async () => {
    const bridge = setup(os, null);
    await bridge.configureNativeMonitor(true, 15, '', '', '');
    assert.equal(bridge.isNativeMonitorAvailable(), true);
    assert.equal(await bridge.isNativeMonitorRunning(), true);
  });
}
