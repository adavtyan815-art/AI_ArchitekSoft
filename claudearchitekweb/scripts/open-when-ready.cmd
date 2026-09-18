@echo off
rem Opens the admin dashboard in the default browser as soon as the local server answers /api/health.
rem start_local.bat launches this detached, so the first run no longer shows "connection refused"
rem while Next.js is still compiling the first page.
rem
rem Usage: scripts\open-when-ready.cmd [baseUrl] [attempts]   (default http://localhost:3100, 120 tries ~4 min)
setlocal
set "URL=%~1"
if "%URL%"=="" set "URL=http://localhost:3100"
set "TRIES=%~2"
if "%TRIES%"=="" set "TRIES=120"

rem curl.exe ships with Windows 10 1803 and later.
where curl.exe >nul 2>nul || goto :nocurl

for /l %%i in (1,1,%TRIES%) do (
  curl.exe -s -f -o nul --max-time 2 "%URL%/api/health" >nul 2>nul
  if not errorlevel 1 (
    start "" "%URL%/admin"
    exit /b 0
  )
  rem ~1 s between attempts; ping works when timeout.exe cannot read the console.
  ping -n 2 127.0.0.1 >nul
)
rem Never answered: the URLs printed by start_local.bat stay the fallback.
exit /b 1

:nocurl
rem No curl: give the server a head start instead of probing it.
ping -n 21 127.0.0.1 >nul
start "" "%URL%/admin"
exit /b 0
