# Background whitelist monitoring

Android's active monitor uses the local `modules/background-monitor` foreground
service. It displays a quiet ongoing notification, schedules native wake-up alarms
at 15–30-minute intervals, and runs the existing Expo TaskManager check. The next
elapsed-time deadline is saved **before** checking sites and advances from the
previous deadline, so 15-second network timeouts do not accumulate timing drift.
Missed intervals coalesce into one check instead of creating a burst.

The alarm uses `OnAlarmListener`, which does not require the special exact-alarm
permission. Its lifetime is tied to the visible foreground service; `START_STICKY`
and boot/package-update restoration recreate it after a service restart. A wake
lock is held only during a check, with a 95-second safety timeout. Native execution
is bounded to 90 seconds. Stopping the last monitoring switch cancels the alarm,
coroutine, wake lock, and ongoing notification. No wake lock is held between checks.

Foreground services are still subject to Android/vendor restrictions. Force-stop
prevents execution until the app is opened again. On Xiaomi, allow autostart and
unrestricted battery use. This is not a guarantee of exact execution in every
Doze/battery-saving state, and should be tested overnight on target devices.

## WorkManager fallback and Expo patches

A unique periodic WorkManager request (`EXPO_BACKGROUND_PERIODIC_WORKER`) remains
as a fallback when the foreground service is absent. While the service is active,
that worker returns without launching a second site check. The service can execute
checks while the app UI is visible as well as in the background.

The SDK 54 patch replaces a chain of one-time requests with periodic work, preserves
its enqueue time on cold startup, and migrates the old chain. Exceptions/timeouts
request a retry; system cancellation is propagated. JS redeliveries share any check
still in flight, including notification/state writes, because cancellation of the
native coroutine does not cancel a queued JS event.

The fallback intentionally has no `CONNECTED` constraint: Android's validation
endpoints may themselves be blocked by a whitelist. The task checks cellular/VPN,
probes the sites, and checks connectivity again before accepting the result.

Keep `expo-task-manager`, `unimodules-app-loader`, and `expo-background-task` in
`expo.autolinking.android.buildFromSource`. Keep the TaskManager timer patch and
imports in root `index.js` before `expo-router/entry`. Rebuild the APK after native
changes. The foreground module depends on the patched BackgroundTaskScheduler.

## Notification policy

Normal monitoring notifies for the first valid result and subsequent changes.
Wi-Fi, VPN, disconnected cellular, and failure of all control sites skip comparison
and preserve the last valid state. Permission/delivery failures also preserve state
so the notification can be retried. Test mode reports every actual run, including
skips; test-only checks do not update the normal monitor's state.

The delivery test is a separate one-time notification scheduled approximately 15
seconds after the test switch changes from off to on. An already enabled switch
does not schedule another delivery test on startup or APK update. Seeing this
notification does not prove that a site check ran. The ongoing service notification
is a separate, silent channel and does not indicate a whitelist transition.

iOS retains Expo background-task scheduling; there is no Android foreground service
on iOS or web. Telegram uses Firebase/server events and native notification handling;
a push server cannot observe this phone's local carrier restrictions.

## Validation

Run from the repository root:

```powershell
npm test
npm run lint
npm run typecheck
npm run install
```

`npm run install` applies Expo patches before prebuild/Gradle and deploys the APK.
The automatic `install` lifecycle during `npm ci`/`npm install` skips deployment;
`postinstall` still applies dependency patches normally.

Native scheduling regression tests:

```powershell
Push-Location android
.\gradlew.bat :background-monitor:testReleaseUnitTest
Pop-Location
```

Device checks:

1. Enable normal monitoring and allow notifications. Confirm the quiet ongoing
   notification and `isForeground=true` in `adb shell dumpsys activity services`
   for `expo.modules.backgroundmonitor.BackgroundMonitorService`.
2. Minimize/remove the Activity and turn the screen off. Do not reopen it during
   the test. Record at least three consecutive real checks from Logcat, including
   `Starting scheduled check`, `BackgroundMonitor ... Completed`, native task
   completion, and the next alarm. Compare start timestamps and confirm no drift.
3. On unchanged cellular status with test mode off, expect `notification: none`,
   not a new alert every interval. Check both actual carrier-state transitions
   when restricted/open mobile networks are available.
4. Repeat with Wi-Fi, VPN, and no internet: preserve the baseline and remain quiet
   in normal mode. In test mode, actual checks report why they were skipped.
5. Switch Wi-Fi/VPN on during requests: discard the mixed-network result.
6. Deny/restore alert-channel or notification permission: do not consume a pending
   state transition. Re-enter the app after service failure: restore the service
   without postponing the saved deadline.
7. Disable both switches: verify that the service, alarm, wake lock, notification,
   and fallback registration stop. Re-enable: one service and one alarm only.
8. Check boot/package-update recovery and long idle/overnight behavior separately.
   Do not use `am force-stop` to simulate ordinary system memory reclamation.
9. Restore the device's original Wi-Fi/mobile/VPN state after testing.

WorkManager can be inspected using `adb shell dumpsys jobscheduler`. Its jobs need
not show `PERIODIC` because WorkManager implements recurrence itself. `cmd
jobscheduler run -f` does not bypass WorkManager's own next-run time for periodic
requests, and should not launch a second check while the foreground service owns
monitoring. It cannot validate the active service's 15-minute cadence.

Useful Logcat tags: `WhitelistMonitorService`, `ReactNativeJS`,
`BackgroundTaskScheduler`, `ExpoTaskManager`, `TaskService`, `WM-WorkerWrapper`.
Use the `.dev` package for a development build.

Sources: [Android foreground service types](https://developer.android.com/develop/background-work/services/fgs/service-types#special-use),
[Android alarms and listener permission exception](https://developer.android.com/develop/background-work/services/alarms),
[Android work requests](https://developer.android.com/develop/background-work/background-tasks/persistent/getting-started/define-work),
[Expo SDK 54 background tasks](https://github.com/expo/expo/blob/sdk-54/docs/pages/versions/unversioned/sdk/background-task.mdx),
[Telegram Firebase listener](https://github.com/DrKLO/Telegram/blob/master/TMessagesProj/src/main/java/org/telegram/messenger/GcmPushListenerService.java),
[Telegram notification troubleshooting](https://telegram.org/faq#notification-problems).
