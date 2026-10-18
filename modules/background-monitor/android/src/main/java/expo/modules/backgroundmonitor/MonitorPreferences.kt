package expo.modules.backgroundmonitor

import android.content.Context
import android.os.SystemClock
import android.provider.Settings

internal class MonitorPreferences(private val context: Context) {
  private val preferences = context.getSharedPreferences("foreground-whitelist-monitor", Context.MODE_PRIVATE)
  val enabled get() = preferences.getBoolean("enabled", false)
  val interval get() = preferences.getLong("interval", 15 * 60_000L)
  val title get() = preferences.getString("title", "Whitelist monitoring")!!
  val body get() = preferences.getString("body", "Monitoring is enabled")!!
  val channelName get() = preferences.getString("channelName", "Background monitoring")!!
  private val bootCount get() = Settings.Global.getInt(context.contentResolver, Settings.Global.BOOT_COUNT, -1)

  var nextDeadline: Long
    get() {
      // elapsedRealtime resets on reboot; a deadline from the old boot is invalid.
      if (preferences.getInt("bootCount", -2) != bootCount) return SystemClock.elapsedRealtime()
      return preferences.getLong("nextDeadline", SystemClock.elapsedRealtime())
    }
    set(value) {
      preferences.edit().putLong("nextDeadline", value).putInt("bootCount", bootCount).apply()
    }

  fun configure(enable: Boolean, minutes: Int, title: String, body: String, channelName: String) {
    val nextInterval = minutes.coerceIn(15, 30) * 60_000L
    val restartSchedule = !enabled || interval != nextInterval
    preferences.edit()
      .putBoolean("enabled", enable)
      .putLong("interval", nextInterval)
      .putString("title", title)
      .putString("body", body)
      .putString("channelName", channelName)
      .apply()
    if (enable && restartSchedule) nextDeadline = SystemClock.elapsedRealtime()
  }
}
