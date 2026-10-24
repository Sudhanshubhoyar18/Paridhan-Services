@echo off
title Paridhan Uniforms - Production Server
echo ========================================================
echo   Paridhan Uniforms Billing System (Production Mode)
echo ========================================================
echo Building frontend for production...
call npm --prefix frontend run build
echo Starting unified server on http://localhost:5000 and network http://0.0.0.0:5000...
start cmd /k "npm --prefix backend start"
timeout /t 3 /nobreak >nul
echo Opening in default browser...
start http://localhost:5000
echo.
echo Production server is live!
echo Local PC: http://localhost:5000
echo Phone Wi-Fi: http://192.168.0.102:5000
