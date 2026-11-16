# Compara precios entre los proveedores configurados en .env.local.
# Uso:  .\scripts\precios.ps1                      (suscriptores, top 15)
#       .\scripts\precios.ps1 -Buscar "views|vistas" -Top 20
param(
  [string]$Buscar = "subscri|suscript|\bsubs\b",
  [int]$Top = 15
)

$ErrorActionPreference = "Stop"
$envFile = Join-Path (Split-Path $PSScriptRoot -Parent) ".env.local"
if (!(Test-Path $envFile)) { throw "No encuentro .env.local en la carpeta del proyecto." }

$vars = @{}
Get-Content $envFile | Where-Object { $_ -match '^\s*[A-Z0-9_]+\s*=' } | ForEach-Object {
  $k, $v = $_ -split '=', 2
  $vars[$k.Trim()] = $v.Trim().Trim('"').Trim("'")
}

$providers = @()
if ($vars.SMM_PANEL_API_URL -and $vars.SMM_PANEL_API_KEY) {
  $providers += @{ Name = ($vars.SMM_PANEL_NAME, "SMM-Panel" | Where-Object { $_ } | Select-Object -First 1); Url = $vars.SMM_PANEL_API_URL; Key = $vars.SMM_PANEL_API_KEY }
}
foreach ($n in 2..5) {
  $url = $vars["SMM_PROVIDER_${n}_API_URL"]; $key = $vars["SMM_PROVIDER_${n}_API_KEY"]
  if ($url -and $key) { $providers += @{ Name = ($vars["SMM_PROVIDER_${n}_NAME"], "Proveedor $n" | Where-Object { $_ } | Select-Object -First 1); Url = $url; Key = $key } }
}
if ($providers.Count -eq 0) { throw "No hay proveedores configurados en .env.local." }

$markup = 30
if ($vars.SMM_MARKUP_PERCENT -match '^\d+(\.\d+)?$') { $markup = [double]$vars.SMM_MARKUP_PERCENT }

$all = @()
foreach ($p in $providers) {
  try {
    $response = Invoke-RestMethod -Method Post -Uri $p.Url -Body @{ key = $p.Key; action = "services" } -TimeoutSec 60
    # A single object with "error" means the provider refused (e.g. invalid key); a list means services.
    if ($response -isnot [array] -and $response.PSObject.Properties["error"]) {
      Write-Host "$($p.Name): ERROR del proveedor -> $($response.error)" -ForegroundColor Red
      continue
    }
    $services = @($response | Where-Object { $_.PSObject.Properties["service"] })
    if ($services.Count -eq 0) {
      Write-Host "$($p.Name): respuesta inesperada (no es una lista de servicios). Revisa la URL de la API." -ForegroundColor Red
      continue
    }
    $found = $services | Where-Object { "$($_.name) $($_.category)" -match $Buscar }
    Write-Host "$($p.Name): $($services.Count) servicios, $($found.Count) coinciden con '$Buscar'" -ForegroundColor Green
    $all += $found | ForEach-Object {
      [pscustomobject]@{
        Proveedor = $p.Name
        ID        = $_.service
        'Coste/1000' = [math]::Round([double]$_.rate, 4)
        'Venta/1000' = [math]::Round([double]$_.rate * (1 + $markup / 100), 4)
        Min       = $_.min
        Max       = $_.max
        Refill    = if ($_.refill) { "Si" } else { "No" }
        Servicio  = $_.name
      }
    }
  } catch {
    Write-Host "$($p.Name): no responde ($($_.Exception.Message))" -ForegroundColor Red
  }
}

Write-Host "`nLos $Top mas baratos (margen $markup%):" -ForegroundColor Cyan
$all | Sort-Object 'Coste/1000' | Select-Object -First $Top | Format-Table -AutoSize -Wrap
