package expo.modules.backgroundmonitor

import android.content.Intent
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout

class BackgroundMonitorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BackgroundMonitor")

    AsyncFunction("configure") Coroutine { enabled: Boolean, minutes: Int, title: String, body: String, channelName: String ->
      val context = requireNotNull(appContext.reactContext).applicationContext
      withContext(Dispatchers.Main) {
        MonitorPreferences(context).configure(enabled, minutes, title, body, channelName)
        if (enabled) {
          BackgroundMonitorService.start(context)
        } else {
          context.stopService(Intent(context, BackgroundMonitorService::class.java))
        }
      }
      // Do not report successful registration before Android actually starts it.
      withTimeout(5_000L) {
        while (BackgroundMonitorService.isRunning != enabled) delay(25L)
      }
    }

    AsyncFunction("isRunning") { BackgroundMonitorService.isRunning }
  }
}
