@echo off
setlocal
cd /d "%~dp0"
set "EXTRA="
if /I "%~1"=="--no-browser" set "EXTRA=-NoBrowser"
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found on PATH. Install Node.js 20 or newer from https://nodejs.org
  if /I not "%~1"=="--no-browser" pause
  exit /b 2
)
powershell.exe -NoProfile -File "%~dp0start-app.ps1" %EXTRA%
set "CODE=%ERRORLEVEL%"
if not "%CODE%"=="0" (
  if /I not "%~1"=="--no-browser" pause
  exit /b %CODE%
)
if /I not "%~1"=="--no-browser" ping -n 6 127.0.0.1 >nul
exit /b 0
