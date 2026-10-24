@echo off
title Paridhan Uniforms - Development Server
echo ========================================================
echo   Paridhan Uniforms Billing System (Development Mode)
echo ========================================================
echo Starting Backend on http://localhost:5000...
start cmd /k "npm --prefix backend run dev"
timeout /t 3 /nobreak >nul
echo Starting Frontend on http://localhost:5173...
start cmd /k "npm --prefix frontend run dev"
timeout /t 3 /nobreak >nul
echo Opening in default browser...
start http://localhost:5173
echo.
echo App is running!
