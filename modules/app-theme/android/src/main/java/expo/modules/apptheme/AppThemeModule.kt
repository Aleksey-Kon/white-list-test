package expo.modules.apptheme

import android.app.UiModeManager
import android.content.Context
import android.os.Build
import androidx.appcompat.app.AppCompatDelegate
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

internal object AppThemeSettings {
  private const val PREFERENCES = "app-theme"
  private const val KEY = "selected-theme"

  fun restore(context: Context) {
    val theme = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).getString(KEY, null)
    if (theme == "light" || theme == "dark") apply(context, theme)
  }

  fun save(context: Context, theme: String) {
    require(theme == "light" || theme == "dark") { "Invalid theme" }
    // Native preferences are available before React and AsyncStorage start.
    context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
      .edit().putString(KEY, theme).apply()
    apply(context, theme)
  }

  private fun apply(context: Context, theme: String) {
    val dark = theme == "dark"
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      // Android persists this per-app setting and uses it for the next system splash.
      val manager = context.getSystemService(Context.UI_MODE_SERVICE) as UiModeManager
      val mode = if (dark) UiModeManager.MODE_NIGHT_YES else UiModeManager.MODE_NIGHT_NO
      manager.setApplicationNightMode(mode)
    }
    val mode = if (dark) AppCompatDelegate.MODE_NIGHT_YES else AppCompatDelegate.MODE_NIGHT_NO
    if (AppCompatDelegate.getDefaultNightMode() != mode) AppCompatDelegate.setDefaultNightMode(mode)
  }
}

class AppThemeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AppTheme")
    AsyncFunction("setTheme") { theme: String ->
      val context = requireNotNull(appContext.reactContext) { "React context unavailable" }
      AppThemeSettings.save(context, theme)
    }.runOnQueue(Queues.MAIN)
  }
}
