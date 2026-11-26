package expo.modules.pixelinfo

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Environment
import android.os.StatFs
import android.widget.RemoteViews
import java.util.Locale

class PixelWidget : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    render(context, manager, ids)
  }

  companion object {
    fun updateAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, PixelWidget::class.java))
      if (ids.isNotEmpty()) render(context, manager, ids)
    }

    private fun render(context: Context, manager: AppWidgetManager, ids: IntArray) {
      val battery = BatteryReading.from(context)
      val free = StatFs(Environment.getDataDirectory().path).availableBytes / 1e9

      val views = RemoteViews(context.packageName, R.layout.pixel_widget)
      views.setTextViewText(R.id.pixel_widget_battery, battery.level?.let { "$it %" } ?: "--")
      views.setProgressBar(R.id.pixel_widget_bar, 100, battery.level ?: 0, false)
      val temperature = battery.temperature
        ?.let { String.format(Locale.FRANCE, " · %.1f °C", it) } ?: ""
      views.setTextViewText(
        R.id.pixel_widget_details,
        String.format(Locale.FRANCE, "%.1f Go libres", free) + temperature
      )

      val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
        views.setOnClickPendingIntent(
          R.id.pixel_widget_root, PendingIntent.getActivity(context, 0, it, flags)
        )
      }
      val refresh = Intent(context, PixelWidget::class.java)
        .setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
        .putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
      views.setOnClickPendingIntent(
        R.id.pixel_widget_refresh, PendingIntent.getBroadcast(context, 1, refresh, flags)
      )

      manager.updateAppWidget(ids, views)
    }
  }
}
