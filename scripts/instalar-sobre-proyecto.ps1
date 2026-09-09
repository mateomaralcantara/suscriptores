param(
  [Parameter(Mandatory = $true)]
  [string]$Destino
)

$ErrorActionPreference = "Stop"
$Origen = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Destino = [System.IO.Path]::GetFullPath($Destino)
$Fecha = Get-Date -Format "yyyyMMdd-HHmmss"
$Padre = Split-Path $Destino -Parent
$Nombre = Split-Path $Destino -Leaf
$Backup = Join-Path $Padre "$Nombre-backup-$Fecha"

Write-Host "INSTALACION LIMPIA Y SEGURA" -ForegroundColor Cyan
Write-Host "Origen: $Origen"
Write-Host "Destino: $Destino"

if (Test-Path $Destino) {
  Write-Host "Creando respaldo completo en: $Backup" -ForegroundColor Yellow
  Copy-Item $Destino $Backup -Recurse -Force

  Write-Host "Limpiando archivos de aplicacion anteriores para evitar rutas duplicadas..." -ForegroundColor Yellow
  Get-ChildItem $Destino -Force | Where-Object {
    $_.Name -notin @(".git", ".env", ".env.local", ".repair-backup")
  } | Remove-Item -Recurse -Force
} else {
  New-Item -ItemType Directory -Path $Destino -Force | Out-Null
}

Write-Host "Copiando version completa..." -ForegroundColor Cyan
Get-ChildItem $Origen -Force | Where-Object {
  $_.Name -notin @("node_modules", ".next", "tsconfig.tsbuildinfo")
} | Copy-Item -Destination $Destino -Recurse -Force

Set-Location $Destino

if (Test-Path ".\middleware.ts") {
  Rename-Item ".\middleware.ts" "middleware.ts.disabled-$Fecha" -Force
}

Remove-Item ".\.next" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Instalando dependencias..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install fallo." }

Write-Host "Validando TypeScript..." -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "TypeScript fallo. El respaldo permanece en $Backup" }

Write-Host "Ejecutando pruebas..." -ForegroundColor Cyan
npm test
if ($LASTEXITCODE -ne 0) { throw "Las pruebas fallaron. El respaldo permanece en $Backup" }

Write-Host "Compilando produccion..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "El build fallo. El respaldo permanece en $Backup" }

Write-Host "INSTALACION COMPLETADA" -ForegroundColor Green
Write-Host "Respaldo: $Backup" -ForegroundColor Yellow
Write-Host "Ejecuta: npm run dev -- --port 3004" -ForegroundColor Cyan
