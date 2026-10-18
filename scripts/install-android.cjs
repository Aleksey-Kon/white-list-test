const path = require('node:path');
const { spawnSync } = require('node:child_process');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}`);
}

function main() {
  // npm ci/install also invoke the lifecycle named "install". Only the explicit
  // npm run install command should build an APK or access a connected device.
  if (process.env.npm_command !== 'run-script') {
    console.log('Dependency installation: Android deployment skipped. Use npm run install to build and deploy.');
    return;
  }

  // The service compiles against patched Expo APIs; apply patches before Gradle,
  // including on the first explicit build after installing dependencies.
  run(process.execPath, [require.resolve('patch-package/index.js'), '--error-on-fail']);
  run(process.execPath, [require.resolve('expo/bin/cli'), 'prebuild', '--platform', 'android']);
  const androidDirectory = path.resolve(__dirname, '..', 'android');
  const windows = process.platform === 'win32';
  run(windows ? '.\\gradlew.bat' : './gradlew', ['assembleRelease'], {
    cwd: androidDirectory,
    shell: windows,
  });
  run('adb', ['install', '-r', path.join(androidDirectory, 'app/build/outputs/apk/release/app-release.apk')]);
  run('adb', ['shell', 'monkey', '-p', 'com.zvezda4443.testwhitelist', '1']);
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
