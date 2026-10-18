/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function install(npmCommand, options = {}) {
  const calls = [];
  const processMock = { env: { npm_command: npmCommand }, execPath: 'node', platform: options.os ?? 'win32' };
  const requireMock = (name) => {
    if (name === 'node:path') return path;
    if (name === 'node:child_process') return { spawnSync: (command, args, spawnOptions) => {
      calls.push({ command, args, options: spawnOptions });
      return { status: options.failAt === calls.length ? 1 : 0 };
    } };
    throw new Error(`Unexpected import ${name}`);
  };
  requireMock.resolve = (name) => name;
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../scripts/install-android.cjs'), 'utf8'), {
    require: requireMock, process: processMock, __dirname: path.resolve(__dirname, '../scripts'),
    console: { log() {}, error() {} },
  });
  return { calls, exitCode: processMock.exitCode };
}

for (const command of ['ci', 'install', 'rebuild']) {
  test(`npm ${command} installs dependencies without building or deploying Android`, () => {
    const h = install(command);
    assert.equal(h.calls.length, 0);
    assert.equal(h.exitCode, undefined);
  });
}

test('explicit npm run install applies patches before prebuild, Gradle and ADB', () => {
  const h = install('run-script');
  assert.equal(h.calls.length, 5);
  assert.equal(h.calls[0].args[0], 'patch-package/index.js');
  assert.equal(h.calls[1].args[0], 'expo/bin/cli');
  assert.equal(h.calls[2].command, '.\\gradlew.bat');
  assert.equal(h.calls[2].options.shell, true);
  assert.equal(h.calls[3].command, 'adb');
  assert.equal(h.calls[3].args[0], 'install');
  assert.equal(h.calls[4].args[0], 'shell');
  assert.equal(h.exitCode, undefined);
});

test('failed patches prevent compilation and installation', () => {
  const h = install('run-script', { failAt: 1 });
  assert.equal(h.calls.length, 1);
  assert.equal(h.exitCode, 1);
});

test('non-Windows builds use the executable Gradle wrapper without a command shell', () => {
  const h = install('run-script', { os: 'linux' });
  assert.equal(h.calls[2].command, './gradlew');
  assert.equal(h.calls[2].options.shell, false);
});
