$xelatex = Join-Path $env:LOCALAPPDATA 'Programs\MiKTeX\miktex\bin\x64\xelatex.exe'
$pressKitDir = Join-Path $PSScriptRoot '..\press-kit'

if (-not (Test-Path $xelatex)) {
  throw "xelatex.exe not found at '$xelatex'."
}

Push-Location $pressKitDir
try {
  $pressKitSources = @(
    'frisches-epk.tex',
    'frisches-epk-fr.tex'
  )

  foreach ($source in $pressKitSources) {
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($source)

    & $xelatex -interaction=nonstopmode -halt-on-error $source
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    & $xelatex -interaction=nonstopmode -halt-on-error $source
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    Remove-Item "$baseName.aux", "$baseName.out" -ErrorAction SilentlyContinue
  }
}
finally {
  Pop-Location
}
