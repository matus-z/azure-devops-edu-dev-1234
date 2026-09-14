<#
.SYNOPSIS
    Zostaví balík aplikácie: overí povinné súbory a skopíruje `src/` do `dist/`.

.DESCRIPTION
    Celá aplikácia leží v `src/`, preto je build obyčajné skopírovanie
    priečinka. Nový súbor (napr. ďalší hook) sa do balíka dostane sám, bez
    zásahu do pipeline. `tests/`, `ci/` a `README.md` sú mimo `src/`, takže sa
    do balíka nedostanú.

.EXAMPLE
    ./ci/Build-Package.ps1 -Source src -Destination dist
#>
[CmdletBinding()]
param(
    [string]   $Source      = 'src',
    [string]   $Destination = 'dist',
    [string[]] $Required    = @('index.html', 'style.css', 'calc.js', 'app.js')
)

$ErrorActionPreference = 'Stop'

$missing = $Required | Where-Object { -not (Test-Path (Join-Path $Source $_)) }
if ($missing) {
    Write-Host "##vso[task.logissue type=error]Chýbajú súbory: $($missing -join ', ')"
    exit 1
}

New-Item -ItemType Directory -Force -Path $Destination | Out-Null
Copy-Item (Join-Path $Source '*') $Destination -Recurse -Force

Write-Host "Balík `"$Destination`" zostavený z `"$Source`":"
Get-ChildItem $Destination -Recurse -File | Select-Object FullName
