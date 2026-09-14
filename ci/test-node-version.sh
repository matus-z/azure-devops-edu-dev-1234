#!/usr/bin/env bash
#
# Overí, že na agentovi je nainštalovaný Node.js v požadovanej verzii.
#
# Node sa na agentov v pooli inštaluje raz, pri príprave stroja — pipeline ho
# nesťahuje. `NodeTool@0` by ho ťahal z internetu pri každom behu, čo na
# on-prem agentoch bez konektivity (alebo za TLS proxy) zlyhá.
#
# Tento krok preto nič neinštaluje, len overí a vypíše, čo na agentovi je.
# Ak Node chýba alebo je starý, zlyhá hlasne a s návodom čo urobiť.
#
# Použitie:
#   ./ci/test-node-version.sh [--minimum-major 20]

set -euo pipefail

minimum_major=20

while [ $# -gt 0 ]; do
  case "$1" in
    --minimum-major) minimum_major="$2"; shift 2 ;;
    *)
      echo "##vso[task.logissue type=error]Neznámy parameter: $1"
      exit 1
      ;;
  esac
done

if ! command -v node >/dev/null 2>&1; then
  echo "##vso[task.logissue type=error]Node.js nie je na agentovi — treba ho doinštalovať na stroje v pooli"
  exit 1
fi

version="$(node --version)"
if [[ ! "$version" =~ ^v([0-9]+)\. ]]; then
  echo "##vso[task.logissue type=error]Nečakaný výstup 'node --version': $version"
  exit 1
fi

major="${BASH_REMATCH[1]}"
if [ "$major" -lt "$minimum_major" ]; then
  echo "##vso[task.logissue type=error]Node $version je starý — treba aspoň v$minimum_major (kvôli 'node --test')"
  exit 1
fi

echo "OK — Node $version ($(command -v node))"
