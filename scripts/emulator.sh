#!/bin/sh
# Starts the headless test emulator that the Maestro flows run on, creating it
# on first use. mise.toml supplies java, android and ANDROID_HOME.
set -eu

avd=pocket-e2e
image=system-images/android-37.0/aosp_atd/x86_64

# avdmanager writes AVDs under $XDG_CONFIG_HOME/.android when that variable is
# set, as on GitHub's runners, but the Android CLI reads only ~/.android.
export ANDROID_USER_HOME="${ANDROID_USER_HOME:-$HOME/.android}"

android --no-metrics sdk install platform-tools emulator cmdline-tools/latest "$image"

if ! android --no-metrics emulator list | grep -qx "$avd"; then
  echo no | "$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager" create avd \
    --name "$avd" --package "$(echo "$image" | tr / ';')" --device pixel_7
fi

android --no-metrics emulator start --headless "$avd"
