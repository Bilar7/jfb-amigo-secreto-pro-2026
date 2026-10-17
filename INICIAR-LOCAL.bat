@echo off
setlocal
cd /d "%~dp0"
title Bilar Amigo Secreto V3 (NOVO) - iniciar
echo.
echo  ==========================================
echo     BILAR AMIGO SECRETO V3 (NOVO) - modo local
echo  ==========================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo  ERRO: o Node.js nao esta instalado.
  echo  Instale a versao LTS em https://nodejs.org/ e volte a abrir este ficheiro.
  start https://nodejs.org/
  pause
  exit /b 1
)
if not exist "node_modules\vite\package.json" (
  echo  1/2  A instalar dependencias (so na primeira vez, pode demorar 1-3 minutos)...
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo  A instalacao falhou. Verifique a internet e tente de novo.
    pause
    exit /b 1
  )
) else (
  echo  1/2  Dependencias ja instaladas.
)
echo.
echo  2/2  A abrir a aplicacao em http://localhost:5173
echo       (deixe esta janela aberta; para parar feche-a ou carregue Ctrl+C)
echo.
call npm.cmd run dev -- --open
pause
