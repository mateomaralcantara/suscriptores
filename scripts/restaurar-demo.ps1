$ErrorActionPreference = "Stop"
$Project = Split-Path -Parent $PSScriptRoot
Set-Location $Project
Write-Host "Los datos visibles se generan desde lib/demo-data.ts." -ForegroundColor Cyan
Write-Host "Para reiniciar PostgreSQL, ejecute database/migrations/001_initial.sql y database/seed.sql en una base sandbox." -ForegroundColor Yellow
