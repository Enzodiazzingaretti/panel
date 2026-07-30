@echo off
setlocal
cd /d "%~dp0"

set PUERTO=4321
set URL=http://127.0.0.1:%PUERTO%

rem Si el puerto ya responde, el panel ya esta corriendo: solo abrir la ventana
netstat -ano | findstr /c:"127.0.0.1:%PUERTO%" | findstr /c:"LISTENING" >nul 2>&1
if %errorlevel%==0 goto abrir

where node >nul 2>&1
if errorlevel 1 (
  echo No se encontro Node. Instalalo desde https://nodejs.org
  pause
  exit /b 1
)

rem Arranca el servidor sin ventana de consola
start "" /b cmd /c "node server.mjs > panel.log 2>&1"

rem Espera hasta 15 segundos a que el puerto conteste
for /l %%i in (1,1,30) do (
  timeout /t 1 /nobreak >nul
  netstat -ano | findstr /c:"127.0.0.1:%PUERTO%" | findstr /c:"LISTENING" >nul 2>&1
  if not errorlevel 1 goto abrir
)

echo El servidor no arranco. Mira panel.log
pause
exit /b 1

:abrir
set EDGE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
if not exist "%EDGE%" set EDGE=C:\Program Files\Microsoft\Edge\Application\msedge.exe

if exist "%EDGE%" (
  start "" "%EDGE%" --app=%URL%
) else (
  start "" %URL%
)
exit /b 0
