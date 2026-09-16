const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTypescript } = require('./loadTypescript.cjs');

test('Android timer task stays pending until native TaskManager finishes its token', async () => {
  let task;
  loadTypescript('services/backgroundTimerTask.ts', {
    'react-native': {
      Platform: { OS: 'android' },
      AppRegistry: { registerHeadlessTask: (name, provider) => {
        assert.equal(name, 'whitelist-task-manager-timers');
        task = provider();
      } },
    },
  });
  let completed = false;
  task().then(() => { completed = true; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(completed, false, 'an immediately resolved task pauses RN timers again');
});

test('iOS does not register the Android timer task', () => {
  loadTypescript('services/backgroundTimerTask.ts', {
    'react-native': {
      Platform: { OS: 'ios' },
      AppRegistry: { registerHeadlessTask: () => assert.fail('Android-only workaround') },
    },
  });
});
