@echo off
title Verya Installer
echo.
echo  ===========================================================
echo   Verya — Visual editing for real code
echo   Running installer...
echo  ===========================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install.ps1"

echo.
echo Press any key to exit...
pause >nul
