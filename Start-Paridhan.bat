@echo off
title Paridhan Uniforms - 1-Click Launch
color 0A
cls
echo =======================================================================
echo          PARIDHAN UNIFORMS - BILLING ^& INVENTORY MANAGEMENT
echo =======================================================================
echo.

:: 1. Verify Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    color 0C
    echo [ERROR] Node.js is not installed or not in your system PATH!
    echo Please download and install Node.js (LTS) from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Clean up any stale process occupying port 5000
echo [*] Checking port 5000 and freeing stale server instances...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

:: 3. Check if frontend build exists, build if missing
if not exist "frontend\dist\index.html" (
    echo [*] Frontend production bundle not found. Building now...
    call npm --prefix frontend run build
    if %ERRORLEVEL% neq 0 (
        color 0C
        echo [ERROR] Frontend build failed. Check for errors above.
        pause
        exit /b 1
    )
)

:: 4. Start the unified Express server in background
echo [*] Starting Paridhan Server on port 5000...
start "Paridhan Server Engine" /min cmd /c "node backend/src/server.js"

:: 5. Wait for server to become healthy
echo [*] Verifying server health...
set "HEALTHY=0"
for /L %%i in (1,1,10) do (
    timeout /t 1 /nobreak >nul
    curl -s http://localhost:5000/api/health >nul 2>&1
    if not errorlevel 1 (
        set "HEALTHY=1"
        goto :server_ready
    )
)

:server_ready
if "%HEALTHY%"=="0" (
    color 0C
    echo [WARNING] Server is taking longer than expected to respond. Continuing...
) else (
    echo [OK] Paridhan server is active on http://localhost:5000!
)

:: 6. Launch local browser for store counter
start http://localhost:5000

:: 7. Launch Cloudflare Tunnel for phone & internet access
echo.
echo =======================================================================
echo   CONNECTING TO INTERNET FOR PHONE ^& REMOTE ACCESS (FREE CLOUDFLARE)
echo =======================================================================
echo.
echo [*] Launching encrypted tunnel...
echo Look for your public HTTPS link below:
echo (e.g. https://xxxx-xxxx.trycloudflare.com)
echo.
echo Point your phone camera or type that link on ANY Android or iPhone!
echo.
echo [NOTE] Keep this window open while using the app on your phone.
echo Close this window or run Stop-Paridhan.bat to shut down.
echo =======================================================================
echo.

npx cloudflared tunnel --url http://localhost:5000

:: Cleanup on exit
echo.
echo Shutting down Paridhan server...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1
pause

