package expo.modules.pixelinfo

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PixelInfoModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("PixelInfo")

    Function("getBattery") {
      val battery = BatteryReading.from(context)
      mapOf(
        "temperature" to battery.temperature,
        "health" to battery.health,
        "cycles" to battery.cycles
      )
    }

    Function("updateWidgets") {
      PixelWidget.updateAll(context)
    }

    // Demande à l'écran d'accueil d'ajouter le widget ; false si ce n'est pas possible
    Function("requestPinWidget") {
      val manager = AppWidgetManager.getInstance(context)
      manager.isRequestPinAppWidgetSupported &&
        manager.requestPinAppWidget(ComponentName(context, PixelWidget::class.java), null, null)
    }
  }
}
