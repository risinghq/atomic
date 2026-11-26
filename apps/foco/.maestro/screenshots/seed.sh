#!/bin/sh
# Fills Hoy with three tasks of real length by moving the emulator's clock
# forward between them. scripts/screenshots.sh sets the clock to 09:00 first
# and puts it back afterwards.
set -eu

flows=$(cd "$(dirname "$0")" && pwd)
flow="$flows/../../../../scripts/flow.sh"
adb="$ANDROID_HOME/platform-tools/adb"

advance() {
  now=$("$adb" shell date +%s | tr -d '\r')
  "$adb" shell date "@$((now + $1 * 60))" >/dev/null
}

"$flow" "$flows/start.yaml"
advance 20
"$flow" -e TASK=Informe -e TIMEBOX='1 h' "$flows/switch.yaml"
advance 55
"$flow" -e TASK='Revisión de código' -e TIMEBOX='45 min' "$flows/switch.yaml"
advance 18
