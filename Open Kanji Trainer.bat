@echo off
setlocal
cd /d "%~dp0"
set "URL=http://localhost:5173"

REM If the site is already running, just open it in the browser.
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
if not errorlevel 1 (
  start "" "%URL%"
  exit /b 0
)

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js was not found on this computer.
  echo   Install it from https://nodejs.org and try again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo   First-time setup: installing dependencies, please wait...
  call npm install
)

echo   Starting Kanji Trainer... a browser tab will open shortly.
start "Kanji Trainer (keep this window open)" cmd /k "npm run dev -- --open"
exit /b 0
