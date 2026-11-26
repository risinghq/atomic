package com.risinghq.foco.voice

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject

/** The spoken chimes waiting in AlarmManager, kept in preferences so a reboot can restore them. */
internal object Alarms {
  const val textExtra = "text"

  private const val store = "foco.voice"
  private const val pendingKey = "pending"

  fun replace(context: Context, chimes: List<Pair<Long, String>>) {
    val alarms = context.getSystemService(AlarmManager::class.java)

    for (index in saved(context).indices) {
      intent(context, index, null, PendingIntent.FLAG_NO_CREATE)?.let {
        alarms.cancel(it)
        it.cancel()
      }
    }

    save(context, chimes)
    arm(context, chimes)
  }

  fun restore(context: Context) {
    val now = System.currentTimeMillis()
    replace(context, saved(context).filter { it.first > now })
  }

  private fun arm(context: Context, chimes: List<Pair<Long, String>>) {
    val alarms = context.getSystemService(AlarmManager::class.java)
    val exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms()

    chimes.forEachIndexed { index, (at, text) ->
      val operation = intent(context, index, text, PendingIntent.FLAG_UPDATE_CURRENT) ?: return@forEachIndexed

      if (exact) alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, operation)
      else alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, operation)
    }
  }

  // PendingIntents match on request code and component, not extras, so the
  // index alone identifies an alarm and FLAG_UPDATE_CURRENT swaps its text.
  private fun intent(context: Context, index: Int, text: String?, flags: Int): PendingIntent? {
    val intent = Intent(context, VoiceReceiver::class.java).putExtra(textExtra, text)
    return PendingIntent.getBroadcast(context, index, intent, flags or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun saved(context: Context): List<Pair<Long, String>> {
    val raw = context.getSharedPreferences(store, Context.MODE_PRIVATE).getString(pendingKey, null)
      ?: return emptyList()
    val list = JSONArray(raw)

    return (0 until list.length()).map {
      val item = list.getJSONObject(it)
      item.getLong("at") to item.getString("text")
    }
  }

  private fun save(context: Context, chimes: List<Pair<Long, String>>) {
    val list = JSONArray()
    for ((at, text) in chimes) list.put(JSONObject().put("at", at).put("text", text))

    context.getSharedPreferences(store, Context.MODE_PRIVATE)
      .edit()
      .putString(pendingKey, list.toString())
      .apply()
  }
}
