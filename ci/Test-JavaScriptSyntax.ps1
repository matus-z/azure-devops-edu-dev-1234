<#
.SYNOPSIS
    Syntaktická kontrola všetkých `.js` súborov bez ich spustenia.

.DESCRIPTION
    `node --check` zachytí preklep, ktorý by inak spadol až v prehliadači.
    Súbory sa hľadajú rekurzívne, takže nový hook je pokrytý automaticky.

.EXAMPLE
    ./ci/Test-JavaScriptSyntax.ps1 -Path src
#>
[CmdletBinding()]
param(
    [string] $Path = 'src'
)

$ErrorActionPreference = 'Stop'

$scripts = Get-ChildItem $Path -Recurse -Filter *.js
if (-not $scripts) {
    Write-Host "##vso[task.logissue type=error]V `"$Path`" nie sú žiadne .js súbory — kontrola by prešla naprázdno"
    exit 1
}

foreach ($script in $scripts) {
    node --check $script.FullName
    if ($LASTEXITCODE -ne 0) {
        Write-Host "##vso[task.logissue type=error]$($script.FullName) má syntaktickú chybu"
        exit 1
    }
}

Write-Host "OK — všetkých $($scripts.Count) skriptov je syntakticky v poriadku."
