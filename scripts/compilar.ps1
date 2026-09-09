$ErrorActionPreference = "Stop"
$Project = Split-Path -Parent $PSScriptRoot
Set-Location $Project
cmd.exe /d /c "npm run typecheck"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
cmd.exe /d /c "npm run build"
exit $LASTEXITCODE
