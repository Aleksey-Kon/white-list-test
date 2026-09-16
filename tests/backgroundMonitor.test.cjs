const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTypescript } = require('./loadTypescript.cjs');

const TASK = 'background-whitelist-monitor';
const ENABLED = 'background-monitor-enabled';
const TEST = 'background-monitor-test-enabled';
const STATE = 'last-whitelist-state';
const RUN = 'background-monitor-last-run';

function setup(options = {}) {
  const storage = new Map(Object.entries(options.storage ?? {}));
  const calls = [];
  const scheduled = new Map();
  let registration = options.registration;
  let definedTask;
  const state = {
    permissions: { granted: true, canAskAgain: true },
    channel: { importance: 4 },
    available: true,
    backgroundStatus: 2,
    network: { type: 'CELLULAR', isConnected: true },
    vpn: false,
    ping: async (url) => ({ url, accessible: true }),
    ...options,
  };
  const service = loadTypescript('services/backgroundMonitor.ts', {
    '@react-native-async-storage/async-storage': {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, value) => { storage.set(key, value); },
      multiGet: async (keys) => keys.map((key) => [key, storage.get(key) ?? null]),
      multiSet: async (values) => values.forEach(([key, value]) => storage.set(key, value)),
    },
    'expo-background-task': {
      BackgroundTaskStatus: { Available: 2, Restricted: 1 },
      BackgroundTaskResult: { Success: 1, Failed: 2 },
      getStatusAsync: async () => state.backgroundStatus,
      registerTaskAsync: async (taskName, taskOptions) => {
        calls.push('register');
        if (state.failRegistration) { state.failRegistration = false; throw new Error('registration failed'); }
        registration = { taskName, taskType: state.os === 'ios' ? 'backgroundTask' : 'expo-background-task', options: taskOptions };
      },
      unregisterTaskAsync: async () => { calls.push('unregister'); registration = null; },
    },
    'expo-task-manager': {
      isAvailableAsync: async () => state.available,
      isTaskDefined: () => false,
      defineTask: (_name, task) => { definedTask = task; },
      getRegisteredTasksAsync: async () => registration ? [registration] : [],
      isTaskRegisteredAsync: async () => !!registration,
      unregisterTaskAsync: async () => { calls.push('unregister-legacy'); registration = null; },
    },
    'expo-notifications': {
      AndroidImportance: { HIGH: 4, NONE: 0 },
      IosAuthorizationStatus: { PROVISIONAL: 3 },
      SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
      setNotificationHandler: () => calls.push('handler'),
      setNotificationChannelAsync: async () => calls.push('channel'),
      getNotificationChannelAsync: async () => state.channel,
      getPermissionsAsync: async () => state.permissions,
      requestPermissionsAsync: async () => { calls.push('request-permission'); return state.requestResult ?? state.permissions; },
      scheduleNotificationAsync: async (request) => {
        if (state.failNotification) throw new Error('notification failed');
        calls.push('notify');
        const id = request.identifier ?? String(scheduled.size);
        scheduled.set(id, request);
        return id;
      },
      cancelScheduledNotificationAsync: async (id) => { calls.push('cancel-test'); scheduled.delete(id); },
    },
    'expo-network': {
      NetworkStateType: { CELLULAR: 'CELLULAR' },
      getNetworkStateAsync: async () => state.network,
    },
    get 'react-native-vpn-detector'() {
      assert.notEqual(state.os, 'web', 'native VPN module must not load on web');
      return { isVpnActive: () => state.vpn };
    },
    'react-native': { Platform: { OS: state.os ?? 'android' } },
    '../utils/sitePinger': { pingSite: (url) => state.ping(url) },
  });
  return { service, storage, state, calls, scheduled,
    worker: (error) => definedTask({ error }),
    run: () => JSON.parse(storage.get(RUN)),
  };
}

test('normalizes malformed and out-of-range intervals', () => {
  const { normalizeInterval } = loadTypescript('utils/backgroundMonitorPolicy.ts');
  for (const value of [NaN, Infinity, -1, 0, 5]) assert.equal(normalizeInterval(value), 15);
  assert.equal(normalizeInterval(22.6), 23);
  assert.equal(normalizeInterval(99), 30);
});

test('web startup reports unsupported background monitoring without loading the native VPN module', async () => {
  const h = setup({ os: 'web' });
  const snapshot = await h.service.initializeMonitor();
  assert.equal(snapshot.isRegistered, false);
  assert.match(snapshot.issue, /APK/);
});

test('first result notifies; unchanged result is quiet; both state transitions notify', async () => {
  const h = setup({ storage: { [ENABLED]: 'true' } });
  assert.equal(await h.worker(), 1);
  assert.equal(h.scheduled.size, 1);
  assert.equal(h.storage.get(STATE), 'false');
  await h.worker();
  assert.equal(h.scheduled.size, 1);
  h.state.ping = async (url) => ({ accessible: url.includes('vk.com') });
  await h.worker();
  assert.equal(h.scheduled.size, 2);
  assert.equal(h.storage.get(STATE), 'true');
  h.state.ping = async () => ({ accessible: true });
  await h.worker();
  assert.equal(h.scheduled.size, 3);
  assert.equal(h.storage.get(STATE), 'false');
});

test('test mode reports every real worker run even if unchanged', async () => {
  const h = setup({ storage: { [TEST]: 'true', [STATE]: 'false' } });
  await h.worker();
  await h.worker();
  assert.equal(h.scheduled.size, 2);
});

for (const [reason, options] of [
  ['Wi-Fi', { network: { type: 'WIFI' } }],
  ['VPN', { vpn: true }],
  ['offline', { ping: async () => ({ accessible: false }) }],
]) {
  test(`${reason}: persists skip and notifies in test mode without changing baseline`, async () => {
    const h = setup({ ...options, storage: { [TEST]: 'true', [STATE]: 'false' } });
    await h.worker();
    assert.equal(h.run().status, 'skipped');
    assert.equal(h.run().notification, 'scheduled');
    assert.equal(h.storage.get(STATE), 'false');
    assert.equal(h.scheduled.size, 1);
  });
}

test('ordinary monitoring skips Wi-Fi without notification', async () => {
  const h = setup({ network: { type: 'WIFI' }, storage: { [ENABLED]: 'true' } });
  await h.worker();
  assert.equal(h.run().status, 'skipped');
  assert.equal(h.scheduled.size, 0);
});

test('blocked permissions preserve baseline and retry after permission is restored', async () => {
  const h = setup({ permissions: { granted: false }, storage: { [ENABLED]: 'true' } });
  await h.worker();
  assert.equal(h.run().notification, 'blocked');
  assert.equal(h.storage.has(STATE), false);
  assert.equal(h.calls.includes('request-permission'), false);
  h.state.permissions = { granted: true };
  await h.worker();
  assert.equal(h.scheduled.size, 1);
});

test('denial does not enable either switch or register the worker', async () => {
  const h = setup({ permissions: { granted: false, canAskAgain: true } });
  await assert.rejects(h.service.updateMonitorSettings({ isTestEnabled: true }), /Уведомления запрещены/);
  assert.equal(h.storage.has(TEST), false);
  assert.equal(h.calls.includes('register'), false);
  assert.ok(h.calls.indexOf('channel') < h.calls.indexOf('request-permission'));
});

test('disabled Android channel blocks enabling', async () => {
  const h = setup({ channel: { importance: 0 } });
  await assert.rejects(h.service.updateMonitorSettings({ isEnabled: true }), /Канал/);
  assert.equal(h.calls.includes('register'), false);
});

test('test switch schedules a native delayed notification and cancels it when disabled', async () => {
  const h = setup();
  await h.service.updateMonitorSettings({ isTestEnabled: true });
  const [notification] = h.scheduled.values();
  assert.equal(notification.trigger.seconds, 15);
  assert.equal(notification.trigger.channelId, 'whitelist-monitor');
  assert.equal(notification.content.data.kind, 'delivery-test');
  await h.service.updateMonitorSettings({ isTestEnabled: false });
  assert.equal(h.scheduled.size, 0);
  assert.equal(h.calls.includes('unregister'), true);
});

test('turning off test mode keeps normal monitoring registered', async () => {
  const h = setup();
  await h.service.updateMonitorSettings({ isEnabled: true, isTestEnabled: true });
  await h.service.updateMonitorSettings({ isTestEnabled: false });
  assert.equal((await h.service.getMonitorSnapshot()).isRegistered, true);
  assert.equal(h.calls.filter((c) => c === 'register').length, 1);
  assert.equal(h.calls.includes('unregister'), false);
});

test('startup preserves an existing schedule and does not reschedule the delivery test', async () => {
  const h = setup({ storage: { [ENABLED]: 'true', [TEST]: 'true' },
    registration: { taskName: TASK, taskType: 'expo-background-task', options: { minimumInterval: 15 } } });
  await h.service.initializeMonitor();
  await h.service.initializeMonitor();
  assert.equal(h.calls.includes('register'), false);
  assert.equal(h.calls.includes('unregister'), false);
  assert.equal(h.scheduled.size, 0);
});

test('migrates the old background-fetch registration even when its interval matches', async () => {
  const h = setup({ storage: { [ENABLED]: 'true' },
    registration: { taskName: TASK, taskType: 'backgroundFetch', options: { minimumInterval: 15 } } });
  await h.service.initializeMonitor();
  assert.ok(h.calls.includes('unregister-legacy'));
  assert.ok(h.calls.includes('register'));
});

test('iOS startup recognizes its platform-specific task type without resetting the schedule', async () => {
  const h = setup({ os: 'ios', storage: { [ENABLED]: 'true' },
    registration: { taskName: TASK, taskType: 'backgroundTask', options: { minimumInterval: 15 } } });
  await h.service.initializeMonitor();
  assert.equal(h.calls.includes('register'), false);
  assert.equal(h.calls.includes('unregister-legacy'), false);
});

test('restricted background service still allows users to turn each switch off', async () => {
  const h = setup({ available: false, storage: { [ENABLED]: 'true', [TEST]: 'true' } });
  await h.service.updateMonitorSettings({ isTestEnabled: false });
  await h.service.updateMonitorSettings({ isEnabled: false });
  assert.equal(h.storage.get(TEST), 'false');
  assert.equal(h.storage.get(ENABLED), 'false');
});

test('interval change replaces registration only once and stays in minutes', async () => {
  const h = setup({ storage: { [ENABLED]: 'true' } });
  await h.service.initializeMonitor();
  await h.service.updateMonitorSettings({ intervalMinutes: 22 });
  await h.service.initializeMonitor();
  assert.equal(h.calls.filter((c) => c === 'register').length, 2);
  assert.equal(h.calls.filter((c) => c === 'unregister').length, 1);
  assert.equal(h.storage.get('background-monitor-interval-minutes'), '22');
});

test('unavailable background service cannot enable monitoring', async () => {
  const h = setup({ available: false });
  await assert.rejects(h.service.updateMonitorSettings({ isEnabled: true }), /установленной/);
  assert.equal(h.calls.includes('register'), false);
});

test('registration failure rolls settings back; queue still accepts the next attempt', async () => {
  const h = setup({ failRegistration: true });
  await assert.rejects(h.service.updateMonitorSettings({ isEnabled: true }), /registration failed/);
  assert.equal(h.storage.get(ENABLED), 'false');
  await h.service.updateMonitorSettings({ isEnabled: true });
  assert.equal(h.storage.get(ENABLED), 'true');
});

test('startup registration failure keeps saved switches visible and reports the error', async () => {
  const h = setup({ failRegistration: true, storage: { [ENABLED]: 'true' } });
  const snapshot = await h.service.initializeMonitor();
  assert.equal(snapshot.settings.isEnabled, true);
  assert.equal(snapshot.isRegistered, false);
  assert.match(snapshot.issue, /registration failed/);
});

test('malformed persisted diagnostics are ignored', async () => {
  const h = setup({ storage: { [RUN]: '{"message":{}}' } });
  assert.equal((await h.service.getMonitorSnapshot()).lastRun, null);
});

test('serialized rapid switch changes leave the latest settings and native task consistent', async () => {
  const h = setup();
  await Promise.all([
    h.service.updateMonitorSettings({ isTestEnabled: true }),
    h.service.updateMonitorSettings({ isTestEnabled: false }),
  ]);
  const snapshot = await h.service.getMonitorSnapshot();
  assert.equal(snapshot.settings.isTestEnabled, false);
  assert.equal(snapshot.isRegistered, false);
  assert.equal(h.scheduled.size, 0);
});

test('worker observes disabling during network requests and sends no late notification', async () => {
  const h = setup({ storage: { [ENABLED]: 'true' } });
  h.state.ping = async () => {
    h.storage.set(ENABLED, 'false');
    return { accessible: true };
  };
  await h.worker();
  assert.equal(h.scheduled.size, 0);
});

test('native task errors are persisted as failures', async () => {
  const h = setup({ storage: { [ENABLED]: 'true' } });
  assert.equal(await h.worker({ message: 'native error' }), 2);
  assert.equal(h.run().status, 'error');
  assert.equal(h.run().message, 'native error');
});

test('notification scheduling errors preserve the baseline for retry', async () => {
  const h = setup({ failNotification: true, storage: { [ENABLED]: 'true' } });
  assert.equal(await h.worker(), 2);
  assert.equal(h.storage.has(STATE), false);
  assert.equal(h.run().status, 'error');
});

test('iOS notifications use no Android channel and accept provisional authorization', async () => {
  const h = setup({ os: 'ios', permissions: { granted: false, ios: { status: 3 } }, storage: { [ENABLED]: 'true' } });
  await h.worker();
  assert.equal([...h.scheduled.values()][0].trigger, null);
  assert.equal(h.calls.includes('channel'), false);
});

test('disabled worker does not probe, notify or write a run record', async () => {
  const h = setup({ ping: () => { throw new Error('must not probe'); } });
  assert.equal(await h.worker(), 1);
  assert.equal(h.storage.has(RUN), false);
  assert.equal(h.scheduled.size, 0);
});
