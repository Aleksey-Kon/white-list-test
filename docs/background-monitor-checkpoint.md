# Monitoring checkpoint — 2026-10-16, 21:12 UTC+3

The user took over device testing and asked to resume from this point if issues
appear. Stop the long-running observation here; do not claim that the new
foreground service has already passed two full 15-minute intervals.

## Current implementation and device state

- Release APK with `modules/background-monitor` is installed on the connected
  Xiaomi 2201116SG, Android 13, package `com.zvezda4443.testwhitelist`.
- Normal monitoring is enabled at 15 minutes. Test mode is disabled.
- The user chose a foreground service with an ongoing notification for more
  regular checks. The user confirmed seeing that notification and turned off
  the screen. `isForeground=true`, notification ID `15015` was verified by ADB.
- The service uses exact elapsed-time **wake-up listener alarms**, saves the next
  deadline before executing JS, holds a bounded wake lock only during checks,
  and retains periodic WorkManager as an inactive-service fallback. The backup
  worker completed at 21:09:28 without starting an extra site check.
- Wi-Fi was temporarily disabled for cellular testing and restored to its
  original enabled state at handoff. Cellular data was originally enabled and
  was not changed. Real whitelist comparison skips Wi-Fi/VPN/offline conditions.
- Temporary Logcat collectors and interval-wait scripts were stopped. The
  application's monitoring service was left running for the user's own test.
- Existing user changes enabling the two background UI sections in
  `app/index.tsx` were preserved.

## Evidence already obtained

All timestamps below are 2026-10-16, UTC+3.

| Scheduler | Check started | Completed | Outcome |
| --- | --- | --- | --- |
| WorkManager | 20:35:50.642 | 20:36:05.946 | Cellular restrictions detected; alert delivered |
| WorkManager | 20:54:13.633 | 20:54:28.779 | Same restrictions; no duplicate alert |
| Foreground service | 21:03:57.061 | 21:04:12.112 | Same restrictions; no duplicate alert |

The 18m22.991s interval under WorkManager with the screen off motivated the
foreground service. Android showed its JobScheduler delay alarm as non-waking
and batched. The new service's alarm is `ELAPSED_WAKEUP`, `window=0`; its next
deadline remained unchanged after app foreground/background transitions.
The initial service wake lock was acquired at 21:03:56 and released at 21:04:12.

The service's first two subsequent deadlines were approximately **21:18:56.570**
and **21:33:56.570**. These had not occurred when the user took over testing.
Do not count the earlier WorkManager checks as foreground-service cadence tests.

The separate one-time delivery test was verified in Android's notification
records at 20:26:17 after the user toggled test mode off/on. It is only scheduled
on that switch transition; an already enabled test is not rearmed by APK updates.

## Validation and review

- `npm test`: **104 passed**.
- `npm run lint` and `npm run typecheck`: passed.
- `:background-monitor:testReleaseUnitTest`: **3 Kotlin tests passed** (no drift,
  exact interval advance, missed-interval coalescing).
- Release build and installation succeeded through `npm run install`.
- Final `codex review --uncommitted`: **no actionable defects**.
- Earlier review findings were fixed: overlapping JS redeliveries now share an
  in-flight execution; dependency installation no longer compiles against
  unpatched Expo APIs.

`scripts/install-android.cjs` now distinguishes explicit `npm run install` from
the automatic npm install/ci lifecycle. Explicit deployment applies patches
before prebuild/Gradle/ADB. Dependency installation skips deployment and retains
`postinstall` patch application. Its six regressions, actual CLI resolution, and
`npm_command=run-script` were verified. This installer refactor happened after
the APK installation; it does not alter the installed application's runtime.

## Resume here if a problem is reported

1. Read this checkpoint and `docs/background-monitor-device-test.md`. Inspect
   current uncommitted changes; no commit was created.
2. Check the actual current settings, notification permission/channels, service,
   alarm, and most recent persisted run. Do not toggle settings or reinstall
   before collecting evidence, because doing so can hide the failure.
3. Capture this package's Logcat. Useful tags: `WhitelistMonitorService`,
   `ReactNativeJS`, `ExpoTaskManager`, `BackgroundTaskScheduler`, `TaskService`.
4. Measure at least two complete 15-minute service intervals with screen off on
   cellular. Verify site probes finish, the next deadline stays anchored, wake
   locks release, and unchanged state stays quiet with test mode off.
5. Still unverified on-device: service stop/re-enable cleanup, boot recovery,
   prolonged Doze/overnight behavior, and carrier status transitions under the
   new service. JS transition/skip/permission policies have regression coverage.
6. If native code changes, rebuild the installed app and repeat mandatory review.

Local ignored evidence files are in `.expo/`: `monitor-device-app.log`,
`monitor-device-notifications.log`, `monitor-tests.log`, `monitor-native-tests.log`,
`monitor-build.log`, and `monitor-review.log`. `monitor-device-runs.json` mixes
the old and new schedulers; it must not be used as proof of service cadence.

ADB can install and read logs, but this Xiaomi blocks `input tap/swipe` with
`INJECT_EVENTS`. The user handled switches and the power button manually.
