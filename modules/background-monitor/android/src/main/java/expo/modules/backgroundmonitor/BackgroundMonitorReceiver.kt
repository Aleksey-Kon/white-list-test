package expo.modules.backgroundmonitor

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BackgroundMonitorReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED && intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
    if (!MonitorPreferences(context).enabled) return
    try {
      BackgroundMonitorService.start(context)
    } catch (error: RuntimeException) {
      // Some vendors restrict even user-enabled services. Keep the saved opt-in;
      // the next foreground launch retries and WorkManager remains a fallback.
      Log.e("WhitelistMonitorService", "Could not restore monitoring", error)
    }
  }
}
