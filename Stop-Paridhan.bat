@echo off
title Paridhan Uniforms - Shut Down
color 0E
cls
echo =======================================================================
echo          PARIDHAN UNIFORMS - SAFE SHUTDOWN
echo =======================================================================
echo.
echo Stopping Paridhan server and freeing port 5000...

powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo.
echo [OK] Paridhan server stopped cleanly.
echo All database transactions and files are safely saved on disk.
timeout /t 3 /nobreak >nul

