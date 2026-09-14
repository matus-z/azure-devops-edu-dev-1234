<#
.SYNOPSIS
    Overí, že sa stránka dá otvoriť dvojklikom (z `file://`).

.DESCRIPTION
    Ak sa do stránky dostane `type="module"`, prehliadač ju z `file://`
    odmietne načítať — a zistili by sme to až na workshope. Preto sa to
    kontroluje tu, nad zostaveným balíkom.

.EXAMPLE
    ./ci/Test-FileProtocol.ps1 -Page dist/index.html
#>
[CmdletBinding()]
param(
    [string] $Page = 'dist/index.html'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $Page)) {
    Write-Host "##vso[task.logissue type=error]$Page neexistuje — nie je čo kontrolovať"
    exit 1
}

if (Select-String -Path $Page -Pattern 'type\s*=\s*"module"' -Quiet) {
    Write-Host "##vso[task.logissue type=error]$Page obsahuje type=module — aplikácia sa neotvorí z file://"
    exit 1
}

Write-Host "OK — aplikácia sa dá otvoriť dvojklikom."
