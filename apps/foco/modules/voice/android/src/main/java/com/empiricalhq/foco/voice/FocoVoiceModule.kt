package com.empiricalhq.foco.voice

import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class FocoVoiceModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("FocoVoice")

    AsyncFunction("schedule") { times: List<Double>, texts: List<String> ->
      Alarms.replace(context, times.map { it.toLong() }.zip(texts))
    }

    AsyncFunction("speak") { text: String ->
      Speaker.say(context.applicationContext, text) {}
    }
  }
}
