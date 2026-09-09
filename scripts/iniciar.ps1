param([int]$Port = 3004)
$ErrorActionPreference = "Stop"
$Project = Split-Path -Parent $PSScriptRoot
Set-Location $Project
if (-not (Test-Path "node_modules")) { npm install }
npm run dev -- --port $Port
