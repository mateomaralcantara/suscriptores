param([int]$Port = 3004)
$ErrorActionPreference = "Stop"
$Project = Split-Path -Parent $PSScriptRoot
$ReportDir = Join-Path $Project ".validation"
$Report = Join-Path $ReportDir "resultado.txt"
New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null
Set-Location $Project
$lines = @("VALIDACION GROWTH RESELLER LAB", "Fecha: $(Get-Date)", "")
cmd.exe /d /c "npm run typecheck" 2>&1 | Tee-Object -Variable typeOut
$lines += "=== TYPESCRIPT ==="; $lines += $typeOut
if ($LASTEXITCODE -ne 0) { $lines | Set-Content $Report; throw "TypeScript fallo. Ver $Report" }
cmd.exe /d /c "npm test" 2>&1 | Tee-Object -Variable testOut
$lines += "=== TESTS ==="; $lines += $testOut
if ($LASTEXITCODE -ne 0) { $lines | Set-Content $Report; throw "Pruebas fallaron. Ver $Report" }
cmd.exe /d /c "npm run build" 2>&1 | Tee-Object -Variable buildOut
$lines += "=== BUILD ==="; $lines += $buildOut
$lines | Set-Content $Report -Encoding UTF8
if ($LASTEXITCODE -ne 0) { throw "Build fallo. Ver $Report" }
Write-Host "Validacion completada: $Report" -ForegroundColor Green
