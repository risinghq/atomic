package com.empiricalhq.foco.voice

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.util.Locale

/** Speaks one text in Spanish over the notification stream, then releases the engine. */
internal class Speaker private constructor(
  context: Context,
  private val text: String,
  private val onDone: () -> Unit,
) : TextToSpeech.OnInitListener {
  companion object {
    // A receiver's goAsync window is 10 seconds; finish before the system kills it.
    private const val limitMs = 9_000L

    fun say(context: Context, text: String, onDone: () -> Unit) {
      Speaker(context, text, onDone)
    }
  }

  private val main = Handler(Looper.getMainLooper())
  private val audio = context.getSystemService(AudioManager::class.java)
  private val attributes = AudioAttributes.Builder()
    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
    .build()
  private val focus = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
    .setAudioAttributes(attributes)
    .build()
  private val engine = TextToSpeech(context, this)
  private var finished = false

  init {
    main.postDelayed(::finish, limitMs)
  }

  // With no engine installed, TextToSpeech calls onInit from its own
  // constructor, before `engine` is assigned.
  override fun onInit(status: Int) {
    main.post { start(status) }
  }

  private fun start(status: Int) {
    if (status != TextToSpeech.SUCCESS) return finish()

    val language = engine.setLanguage(Locale.forLanguageTag("es"))
    if (language == TextToSpeech.LANG_MISSING_DATA || language == TextToSpeech.LANG_NOT_SUPPORTED) return finish()

    engine.setAudioAttributes(attributes)
    engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
      override fun onStart(utteranceId: String) {}

      override fun onDone(utteranceId: String) {
        main.post(::finish)
      }

      @Deprecated("Replaced by onError(String, Int)")
      override fun onError(utteranceId: String) {
        main.post(::finish)
      }
    })

    audio.requestAudioFocus(focus)
    engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, "chime")
  }

  private fun finish() {
    if (finished) return
    finished = true

    main.removeCallbacksAndMessages(null)
    audio.abandonAudioFocusRequest(focus)
    engine.shutdown()
    onDone()
  }
}
