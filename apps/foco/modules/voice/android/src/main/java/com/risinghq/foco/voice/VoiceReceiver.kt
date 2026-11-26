package com.risinghq.foco.voice

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioManager

class VoiceReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
      Alarms.restore(context)
      return
    }

    val text = intent.getStringExtra(Alarms.textExtra) ?: return
    val audio = context.getSystemService(AudioManager::class.java)

    // Silent or vibrate mode, or a call in progress, means the person does not want sound.
    if (audio.ringerMode != AudioManager.RINGER_MODE_NORMAL || audio.mode != AudioManager.MODE_NORMAL) return

    val pending = goAsync()
    Speaker.say(context.applicationContext, text) { pending.finish() }
  }
}
