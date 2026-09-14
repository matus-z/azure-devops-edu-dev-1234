<#
.SYNOPSIS
    Overí, že release tag má tvar vX.Y.Z a ukazuje na commit v `main`.

.DESCRIPTION
    Zmyslom je, aby tag nikdy neoznačoval niečo, čo neprešlo `main`. Presne
    toto konfiguračný repozitár overiť nevie — on tagu verí. Tu sa to overiť dá.

    Vyžaduje celú históriu (`fetchDepth: 0`), nie plytký klon.

.EXAMPLE
    ./ci/Test-ReleaseTag.ps1 -Tag v1.2.1 -Branch main
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string] $Tag,
    [string] $Branch = 'main'
)

$ErrorActionPreference = 'Stop'

Write-Host "Kontrolujem tag: $Tag"

if ($Tag -notmatch '^v\d+\.\d+\.\d+$') {
    Write-Host "##vso[task.logissue type=error]Tag '$Tag' nemá tvar vX.Y.Z"
    exit 1
}

git fetch origin $Branch --quiet
$sha = git rev-list -n 1 $Tag

git merge-base --is-ancestor $sha "origin/$Branch"
if ($LASTEXITCODE -ne 0) {
    Write-Host "##vso[task.logissue type=error]Tag '$Tag' neukazuje na commit v $Branch"
    exit 1
}

Write-Host "OK — $Tag ukazuje na $sha, ktorý je v $Branch."
