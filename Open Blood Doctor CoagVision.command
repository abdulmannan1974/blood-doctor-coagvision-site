#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
  osascript -e 'display alert "Python 3 is required to launch Blood Doctor CoagVision."'
  exit 1
fi

python3 "scripts/launch_site.py"
