#!/bin/sh
# Takes the README screenshots of one app on the started emulator:
#
#   ./scripts/screenshots.sh atomic
#
# It installs the app's release APK on a clean state at 09:00 today, fills it
# with apps/<app>/.maestro/screenshots/seed.sh when that exists and seed.yaml
# otherwise, then runs capture.yaml in the light and the dark scheme and writes
# the PNGs to apps/<app>/docs/screenshots/.
set -eu

app=$1
root=$(cd "$(dirname "$0")/.." && pwd)
dir="$root/apps/$app"
flows="$dir/.maestro/screenshots"
id=$(sed -n 's/^appId: //p' "$flows/capture.yaml")
adb="$ANDROID_HOME/platform-tools/adb"
out=$(mktemp -d)

demo() { "$adb" shell am broadcast -a com.android.systemui.demo -e command "$@" >/dev/null; }

restore() {
  "$adb" shell date "$(date +%m%d%H%M%Y.%S)" >/dev/null
  "$adb" shell settings put global auto_time 1
  "$adb" shell settings put global heads_up_notifications_enabled 1
  "$adb" shell wm size reset
  "$adb" shell wm density reset
  "$adb" shell cmd uimode night no
  demo exit
  rm -rf "$out"
}
trap restore EXIT

# Setting the clock needs a root adbd, which emulator images without Google Play
# allow.
"$adb" root >/dev/null
"$adb" wait-for-device
"$adb" shell settings put global auto_time 0
"$adb" shell date "$(date +%m%d)0900$(date +%Y).00" >/dev/null

"$adb" install -r "$dir/android/app/build/outputs/apk/release/app-release.apk"
"$adb" shell pm clear "$id"
"$adb" shell appops set "$id" SCHEDULE_EXACT_ALARM allow

# Half the Pixel 7's pixels at half its density keeps the layout and halves
# each PNG.
"$adb" shell wm size 540x1200
"$adb" shell wm density 210

"$adb" shell settings put global heads_up_notifications_enabled 0
"$adb" shell settings put global sysui_demo_allowed 1
demo enter
demo battery -e level 100 -e plugged false
demo network -e wifi show -e level 4 -e fully true -e mobile hide
demo notifications -e visible false

if [ -x "$flows/seed.sh" ]; then
  "$flows/seed.sh"
else
  "$root/scripts/flow.sh" "$flows/seed.yaml"
fi

for scheme in light dark; do
  if [ "$scheme" = dark ]; then night=yes; else night=no; fi
  "$adb" shell cmd uimode night "$night"
  "$root/scripts/flow.sh" -e SCHEME="$scheme" --test-output-dir "$out/$scheme" "$flows/capture.yaml"
done

mkdir -p "$dir/docs/screenshots"
find "$out" -name '*.png' -exec cp {} "$dir/docs/screenshots/" \;
ls -l "$dir/docs/screenshots"
