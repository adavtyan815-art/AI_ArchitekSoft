@echo off
title Architeksoft B2B Platform & Automation Engine
cd /d "%~dp0dashboard"
echo =========================================================================
echo   ARCHITEKSOFT LUXURY B2B PLATFORM & CLIENT PORTALS ENGINE
echo =========================================================================
echo   - Main B2B Web Experience:    http://localhost:3456
echo   - Client Showcase Portal:     http://localhost:3456/p/aren-kitchen
echo   - Marketing & Admin Console:  http://localhost:3456/admin
echo =========================================================================
node server.js
pause
