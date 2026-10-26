# Inicia Calma desde PowerShell
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Host "No encontramos Node.js. Instala Node.js 18 o superior." -ForegroundColor Yellow
  exit 1
}

# Si ya esta corriendo, solo abre el navegador.
try {
  $r = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/health" -UseBasicParsing -TimeoutSec 2
  if ($r.StatusCode -eq 200 -and $r.Content -match "calma") {
    Write-Host "Calma ya esta corriendo en http://127.0.0.1:8000" -ForegroundColor Green
    Start-Process "http://127.0.0.1:8000"
    exit 0
  }
} catch {}

Write-Host "Calma -> http://127.0.0.1:8000" -ForegroundColor Green
Start-Sleep -Seconds 2
Start-Process "http://127.0.0.1:8000"
node app\server.js
