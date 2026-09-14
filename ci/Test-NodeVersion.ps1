<#
.SYNOPSIS
    Overí, že na agentovi je nainštalovaný Node.js v požadovanej verzii.

.DESCRIPTION
    Node sa na agentov v pooli inštaluje raz, pri príprave stroja — pipeline
    ho nesťahuje. `NodeTool@0` by ho ťahal z internetu pri každom behu, čo na
    on-prem agentoch bez konektivity zlyhá.

    Tento krok preto nič neinštaluje, len overí a vypíše, čo na agentovi je.
    Ak Node chýba alebo je starý, zlyhá hlasne a s návodom čo urobiť.

.EXAMPLE
    ./ci/Test-NodeVersion.ps1 -MinimumMajor 20
#>
[CmdletBinding()]
param(
    [int] $MinimumMajor = 20
)

$ErrorActionPreference = 'Stop'

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "##vso[task.logissue type=error]Node.js nie je na agentovi — treba ho doinštalovať na stroje v pooli"
    exit 1
}

$version = & node --version
if ($version -notmatch '^v(\d+)\.') {
    Write-Host "##vso[task.logissue type=error]Nečakaný výstup 'node --version': $version"
    exit 1
}

$major = [int] $Matches[1]
if ($major -lt $MinimumMajor) {
    Write-Host "##vso[task.logissue type=error]Node $version je starý — treba aspoň v$MinimumMajor (kvôli `node --test`)"
    exit 1
}

Write-Host "OK — Node $version ($($node.Source))"
