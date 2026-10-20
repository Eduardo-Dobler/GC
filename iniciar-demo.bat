@echo off
setlocal

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 ou mais recente nao foi encontrado.
  echo Instale o Node.js e execute este arquivo novamente.
  pause
  exit /b 1
)

cd /d "%~dp0release"
node server.cjs --open

if errorlevel 1 (
  echo.
  echo Nao foi possivel iniciar a demonstracao.
  pause
)
