@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo No se encontro Node en esta maquina. Instalalo desde https://nodejs.org
  pause
  exit /b 1
)

echo Generando diagnostico...
node diagnostico.mjs > diagnostico.txt 2>&1

echo.
echo Listo: diagnostico.txt
echo Se abre en el Notepad. Copia todo (Ctrl+A, Ctrl+C) y pegalo en el chat.
echo.

start "" notepad diagnostico.txt
exit /b 0
