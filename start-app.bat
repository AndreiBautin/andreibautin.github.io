@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js from https://nodejs.org
  pause
  exit /b 1
)
rem Gate pushes on verify in this clone (see .githooks/pre-push); only when
rem git is installed and the clone has not chosen its own hooks path.
where git >nul 2>nul && (git config core.hooksPath >nul 2>nul || git config core.hooksPath .githooks)
node serve.cjs
pause
