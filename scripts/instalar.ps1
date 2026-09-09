$ErrorActionPreference = "Stop"
$Project = Split-Path -Parent $PSScriptRoot
Set-Location $Project
Write-Host "Instalando Growth Reseller Lab..." -ForegroundColor Cyan
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js no esta instalado." }
if (-not (Test-Path ".env.local")) { Copy-Item ".env.example" ".env.local" }
npm install
npm run typecheck
Write-Host "Instalacion completada." -ForegroundColor Green
