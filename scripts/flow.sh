#!/bin/sh
# Runs one Maestro flow and runs it again, up to three tries, when it fails. A
# software-rendered emulator on a loaded host drops its adb connection for a
# moment, and Maestro fails the flow when that happens. Pass maestro test's
# arguments:
#
#   ./scripts/flow.sh -e SCHEME=dark apps/foco/.maestro/screenshots/capture.yaml
set -u

for try in 1 2 3; do
  maestro test "$@" && exit 0
  echo "flow.sh: try $try failed" >&2
done
exit 1
