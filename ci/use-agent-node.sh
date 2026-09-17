#!/usr/bin/env bash
#
# Dá na PATH Node.js pribalený k Azure Pipelines agentovi.
#
# Agent si nosí vlastný Node v `externals/node*/bin/node` — používa ho na
# spúšťanie taskov. Na agentoch v pooli iný Node nie je a `NodeTool@0` by ho
# sťahoval z nodejs.org, čo za TLS proxy s firemnou CA zlyhá. Pribalený Node
# netreba sťahovať ani inštalovať.
#
# Každý kandidát sa naozaj spustí: priečinok môže obsahovať binárku, ktorá na
# danej distribúcii nebeží (napr. kvôli starej glibc). Zo spustiteľných sa
# vyberie najnovší, ktorý spĺňa minimálnu verziu, a cez `task.prependpath` sa
# dá na PATH všetkým ďalším krokom v jobe.
#
# Priečinok `externals` nie je verejné rozhranie agenta — pri aktualizácii
# agenta sa môže zmeniť. Ak tento krok začne zlyhávať, pozri, čo v ňom je.
#
# Použitie:
#   ./ci/use-agent-node.sh [--minimum-major 20] [--agent-home "$AGENT_HOMEDIRECTORY"]

set -euo pipefail

minimum_major=20
agent_home="${AGENT_HOMEDIRECTORY:-}"

while [ $# -gt 0 ]; do
  case "$1" in
    --minimum-major) minimum_major="$2"; shift 2 ;;
    --agent-home)    agent_home="$2";    shift 2 ;;
    *)
      echo "##vso[task.logissue type=error]Neznámy parameter: $1"
      exit 1
      ;;
  esac
done

if [ -z "$agent_home" ]; then
  echo "##vso[task.logissue type=error]Chýba adresár agenta — mimo pipeline ho zadajte cez --agent-home"
  exit 1
fi

externals="$agent_home/externals"
if [ ! -d "$externals" ]; then
  echo "##vso[task.logissue type=error]\"$externals\" neexistuje — je --agent-home adresár agenta?"
  exit 1
fi

best_major=-1
best_dir=""
best_version=""

for candidate in "$externals"/node*/bin/node; do
  [ -x "$candidate" ] || continue

  if ! version="$("$candidate" --version 2>/dev/null)"; then
    echo "Preskakujem $candidate — na tomto agentovi sa nedá spustiť"
    continue
  fi

  if [[ ! "$version" =~ ^v([0-9]+)\. ]]; then
    echo "Preskakujem $candidate — nečakaný výstup '--version': $version"
    continue
  fi

  major="${BASH_REMATCH[1]}"
  echo "Nájdený $candidate: $version"

  if [ "$major" -ge "$minimum_major" ] && [ "$major" -gt "$best_major" ]; then
    best_major="$major"
    best_dir="$(dirname "$candidate")"
    best_version="$version"
  fi
done

if [ -z "$best_dir" ]; then
  echo "##vso[task.logissue type=error]Agent nemá pribalený Node v$minimum_major alebo novší — treba novší agent, alebo Node nainštalovať na stroje v pooli"
  exit 1
fi

echo "##vso[task.prependpath]$best_dir"
echo "OK — použije sa Node $best_version z $best_dir"
