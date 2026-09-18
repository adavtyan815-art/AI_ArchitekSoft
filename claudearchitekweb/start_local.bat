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

rem Install when node_modules has never been filled, or when package-lock.json changed since the last
rem install (after a git pull that adds a dependency). node_modules\.architek-install\package-lock.json
rem is the copy left behind by the last successful install; "xcopy /L /D" lists the file only when the
rem source is newer than that copy, so an unchanged checkout starts without paying for an install.
set "NEED_INSTALL="
if not exist "node_modules" set "NEED_INSTALL=1"
if not exist "node_modules\.architek-install\package-lock.json" set "NEED_INSTALL=1"
if not defined NEED_INSTALL (
  xcopy /L /D /Y "package-lock.json" "node_modules\.architek-install\" 2>nul | findstr /B /C:"1 File" >nul && set "NEED_INSTALL=1"
)

if defined NEED_INSTALL (
  echo  Installing dependencies - the first run takes 1-2 minutes ...
  call npm install --prefer-offline --no-audit --no-fund
  if errorlevel 1 (
    echo  npm install failed.
    pause
    exit /b 1
  )
  xcopy /Y /I /Q "package-lock.json" "node_modules\.architek-install\" >nul
)

if not exist "data\architeksoft.db" (
  echo  Creating the database and seeding demo data ...
  call npm run db:seed
  if errorlevel 1 (
    echo  Database seed failed.
    pause
    exit /b 1
  )
)

echo.
echo  Website:    http://localhost:3100
echo  Admin:      http://localhost:3100/admin
echo  Login:      admin@architeksoft.com
echo  Password:   ADMIN_PASSWORD in .env (local testing default: architek2026)
echo              Change it in Admin - Settings - Security before this machine is reachable from outside.
echo.
echo  The browser opens by itself once the server is ready (the first compile takes a moment).
echo  Press Ctrl+C in this window to stop the server.
echo.

rem Detached waiter: polls /api/health and opens the admin only once the server answers.
start "ArchiTek Soft - open when ready" /b cmd /c "scripts\open-when-ready.cmd http://localhost:3100"
call npm run dev

pause
