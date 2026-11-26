#!/bin/sh
# Runs the Maestro flows on the started emulator, then checks that the chimes
# the flows scheduled reached the alarm manager.
set -eu

app=com.risinghq.foco
adb="$ANDROID_HOME/platform-tools/adb"

android --no-metrics install android/app/build/outputs/apk/release/app-release.apk

# Android 14 denies exact alarms to a new install and the app would open the
# settings screen to ask, which a flow cannot answer.
"$adb" shell pm clear "$app"
"$adb" shell appops set "$app" SCHEDULE_EXACT_ALARM allow

maestro test .maestro

alarms=$("$adb" shell dumpsys alarm | grep -c "$app" || true)
echo "$alarms alarm lines for $app"
test "$alarms" -gt 0

# The flows turn on Voz, which arms one spoken alarm per chime.
voices=$("$adb" shell dumpsys alarm | grep -c "VoiceReceiver" || true)
echo "$voices spoken alarms"
test "$voices" -gt 0
