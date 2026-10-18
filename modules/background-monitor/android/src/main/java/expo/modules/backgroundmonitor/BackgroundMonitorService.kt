package expo.modules.backgroundmonitor

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.util.Log
import androidx.core.app.NotificationCompat
import expo.modules.backgroundtask.BackgroundTaskScheduler
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull

class BackgroundMonitorService : Service() {
  companion object {
    private const val TAG = "WhitelistMonitorService"
    private const val CHANNEL = "whitelist-monitor-service"
    private const val NOTIFICATION_ID = 15015
    @Volatile var isRunning = false
      private set

    fun start(context: Context) {
      val intent = Intent(context, BackgroundMonitorService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent)
      else context.startService(intent)
    }
  }

  private val handler = Handler(Looper.getMainLooper())
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
  private val alarmListener = AlarmManager.OnAlarmListener { tick() }
  private lateinit var preferences: MonitorPreferences
  private lateinit var alarms: AlarmManager
  private lateinit var wakeLock: PowerManager.WakeLock
  private var check: Job? = null

  override fun onCreate() {
    super.onCreate()
    preferences = MonitorPreferences(this)
    alarms = getSystemService(Context.ALARM_SERVICE) as AlarmManager
    wakeLock = (getSystemService(Context.POWER_SERVICE) as PowerManager)
      .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "$packageName:whitelist-check")
      .apply { setReferenceCounted(false) }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (!preferences.enabled) {
      stopSelf()
      return START_NOT_STICKY
    }
    val notifications = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      notifications.createNotificationChannel(NotificationChannel(
        CHANNEL, preferences.channelName, NotificationManager.IMPORTANCE_LOW
      ))
    }
    val launch = packageManager.getLaunchIntentForPackage(packageName)
    val contentIntent = launch?.let {
      PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }
    val icon = resources.getIdentifier("notification_icon", "drawable", packageName)
      .takeIf { it != 0 } ?: android.R.drawable.ic_popup_sync
    val notification = NotificationCompat.Builder(this, CHANNEL)
      .setSmallIcon(icon)
      .setContentTitle(preferences.title)
      .setContentText(preferences.body)
      .setContentIntent(contentIntent)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .build()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
    isRunning = true
    BackgroundTaskScheduler.foregroundMonitorActive = true
    schedule()
    Log.i(TAG, "Monitoring active; interval=${preferences.interval}ms")
    return START_STICKY
  }

  private fun schedule() {
    alarms.cancel(alarmListener)
    handler.removeCallbacksAndMessages(null)
    val deadline = preferences.nextDeadline
    if (deadline <= SystemClock.elapsedRealtime()) {
      handler.post { tick() }
    } else {
      // Listener alarms do not require SCHEDULE_EXACT_ALARM. Their lifetime is
      // tied to this visible foreground service, which restores them on restart.
      alarms.setExact(AlarmManager.ELAPSED_REALTIME_WAKEUP, deadline, TAG, alarmListener, handler)
      Log.i(TAG, "Next check in ${deadline - SystemClock.elapsedRealtime()}ms")
    }
  }

  private fun tick() {
    if (!preferences.enabled) {
      stopSelf()
      return
    }
    val now = SystemClock.elapsedRealtime()
    preferences.nextDeadline = MonitorSchedule.nextDeadline(preferences.nextDeadline, now, preferences.interval)
    // Persist/schedule before starting JS: failure of this check cannot erase
    // the next deadline, and network timeouts cannot add drift to the interval.
    schedule()
    if (check?.isActive == true) {
      Log.w(TAG, "Previous check is still in flight; coalescing this tick")
      return
    }
    synchronized(wakeLock) { wakeLock.acquire(95_000L) }
    check = scope.launch {
      try {
        Log.i(TAG, "Starting scheduled check")
        val result = withTimeoutOrNull(90_000L) {
          BackgroundTaskScheduler.runTasks(applicationContext, packageName, fromForegroundMonitor = true)
          true
        }
        if (result == null) Log.e(TAG, "Check timed out; next deadline remains scheduled")
        else Log.i(TAG, "Scheduled check finished")
      } catch (cancelled: CancellationException) {
        throw cancelled
      } catch (error: Exception) {
        Log.e(TAG, "Check failed; next deadline remains scheduled", error)
      } finally {
        releaseWakeLock()
      }
    }
  }

  private fun releaseWakeLock() {
    synchronized(wakeLock) { if (wakeLock.isHeld) wakeLock.release() }
  }

  override fun onDestroy() {
    alarms.cancel(alarmListener)
    handler.removeCallbacksAndMessages(null)
    scope.cancel()
    releaseWakeLock()
    isRunning = false
    BackgroundTaskScheduler.foregroundMonitorActive = false
    stopForeground(STOP_FOREGROUND_REMOVE)
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null
}
