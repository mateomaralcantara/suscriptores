$ErrorActionPreference = "Stop"
$Project = Split-Path -Parent $PSScriptRoot
Set-Location $Project
cmd.exe /d /c "npm test"
exit $LASTEXITCODE
