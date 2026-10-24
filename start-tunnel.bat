@echo off
title Paridhan Uniforms - Cloudflare Tunnel (Phone Access Worldwide)
echo =====================================================================
echo   Paridhan Uniforms - Secure Internet Access for Mobile Devices
echo =====================================================================
echo Launching Cloudflare Tunnel for http://localhost:5000...
echo Once loaded, you will see a public https://....trycloudflare.com link.
echo Open that link on ANY phone, tablet, or PC anywhere in the world!
echo.
npx cloudflared tunnel --url http://localhost:5000
pause
