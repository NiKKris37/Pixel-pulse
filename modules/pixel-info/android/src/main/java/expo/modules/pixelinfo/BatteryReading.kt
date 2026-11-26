package expo.modules.pixelinfo

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build

data class BatteryReading(
  val level: Int?,
  val temperature: Double?,
  val health: String?,
  val cycles: Int?
) {
  companion object {
    fun from(context: Context): BatteryReading {
      // Dernier état diffusé par Android ; aucune autorisation nécessaire
      val intent: Intent? = context.applicationContext
        .registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))

      fun extra(name: String): Int? =
        intent?.getIntExtra(name, Int.MIN_VALUE)?.takeIf { it != Int.MIN_VALUE }

      val raw = extra(BatteryManager.EXTRA_LEVEL)
      val scale = extra(BatteryManager.EXTRA_SCALE)
      val level = if (raw != null && scale != null && scale > 0) raw * 100 / scale else null

      val health = when (extra(BatteryManager.EXTRA_HEALTH)) {
        BatteryManager.BATTERY_HEALTH_GOOD -> "good"
        BatteryManager.BATTERY_HEALTH_OVERHEAT -> "overheat"
        BatteryManager.BATTERY_HEALTH_DEAD -> "dead"
        BatteryManager.BATTERY_HEALTH_OVER_VOLTAGE -> "overVoltage"
        BatteryManager.BATTERY_HEALTH_COLD -> "cold"
        BatteryManager.BATTERY_HEALTH_UNSPECIFIED_FAILURE -> "failure"
        else -> null
      }

      val cycles = if (Build.VERSION.SDK_INT >= 34) {
        extra(BatteryManager.EXTRA_CYCLE_COUNT)?.takeIf { it > 0 }
      } else null

      return BatteryReading(
        level = level,
        temperature = extra(BatteryManager.EXTRA_TEMPERATURE)?.let { it / 10.0 },
        health = health,
        cycles = cycles
      )
    }
  }
}
