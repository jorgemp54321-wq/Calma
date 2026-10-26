@echo off
setlocal
cd /d "%~dp0"
title Calma - compatibilidad para rosacea

rem Si la app ya esta corriendo, solo abre el navegador.
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200 -and $r.Content -match 'calma') { exit 0 } else { exit 1 } } catch { exit 1 }"
if not errorlevel 1 (
  echo.
  echo Calma ya esta corriendo en http://127.0.0.1:8000
  echo Abriendo el navegador...
  start "" http://127.0.0.1:8000
  timeout /t 2 >nul
  exit /b 0
)

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo No encontramos Node.js en este equipo.
  echo Instala Node.js 18 o superior desde https://nodejs.org y vuelve a intentarlo.
  echo.
  pause
  exit /b 1
)

echo.
echo Iniciando Calma...
echo La app se abrira en http://127.0.0.1:8000
echo.
start "" /b cmd /c "timeout /t 2 >nul & start http://127.0.0.1:8000"
node app\server.js
echo.
echo El servidor se detuvo.
pause
