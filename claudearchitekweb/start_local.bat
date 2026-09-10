@echo off
title ArchiTek Soft - Web System (local)
cd /d "%~dp0"

echo.
echo  ArchiTek Soft - Web System
echo  ==========================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  Node.js is not installed. Install Node.js 22 LTS from https://nodejs.org and run this file again.
  pause
  exit /b 1
)

if not exist ".env" (
  echo  Creating .env from .env.example ...
  copy /y ".env.example" ".env" >nul
)

if not exist "node_modules" (
  echo  Installing dependencies (first run only, 1-2 minutes) ...
  call npm install --no-audit --no-fund
  if errorlevel 1 ( echo  npm install failed. & pause & exit /b 1 )
)

if not exist "data\architeksoft.db" (
  echo  Creating the database and seeding demo data ...
  call npm run db:seed
)

echo.
echo  Website:    http://localhost:3100
echo  Admin:      http://localhost:3100/admin   (admin@architeksoft.com / architek2026)
echo.
echo  Press Ctrl+C in this window to stop the server.
echo.
start "" http://localhost:3100/admin
call npm run dev
pause
