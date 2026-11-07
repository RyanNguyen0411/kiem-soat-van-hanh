@echo off
title GHN Express - Dashboard Dieu Hanh Long An
cd /d "%~dp0"
echo ========================================================
echo   GHN EXPRESS - HE THONG DIEU HANH KHU VUC LONG AN
echo   Quan ly: AM Huy (DNB)
echo ========================================================
echo Dang khoi dong Dashboard...

:: Kiem tra neu dist chua build thi build truoc
if not exist "dist\index.html" (
    echo Dang build he thong lan dau...
    call npm.cmd run build
)

:: Mo trinh duyet
start http://localhost:5173

:: Chay preview server co dinh tren port 5173
call npx.cmd vite preview --port 5173 --host 0.0.0.0
pause
