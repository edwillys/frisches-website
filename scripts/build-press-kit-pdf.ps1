$xelatex = Join-Path $env:LOCALAPPDATA 'Programs\MiKTeX\miktex\bin\x64\xelatex.exe'
$pressKitDir = Join-Path $PSScriptRoot '..\press-kit'

if (-not (Test-Path $xelatex)) {
  throw "xelatex.exe not found at '$xelatex'."
}

Push-Location $pressKitDir
try {
  & $xelatex -interaction=nonstopmode -halt-on-error frisches-epk.tex
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  & $xelatex -interaction=nonstopmode -halt-on-error frisches-epk.tex
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Remove-Item frisches-epk.aux, frisches-epk.out -ErrorAction SilentlyContinue
}
finally {
  Pop-Location
}
