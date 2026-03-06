@echo off
setlocal
cd /d "%~dp0"

echo Running deploy-r2.mjs...
node ".\scripts\deploy-r2.mjs"
set "EXITCODE=%ERRORLEVEL%"

if not "%EXITCODE%"=="0" (
  echo.
  echo Deploy failed with exit code %EXITCODE%.
  exit /b %EXITCODE%
)

echo.
echo Deploy completed successfully.

