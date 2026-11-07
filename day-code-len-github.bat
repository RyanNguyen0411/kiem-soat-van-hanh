@echo off
title Day Code Len GitHub - GHN Long An
cd /d "%~dp0"
echo ========================================================
echo   GHN EXPRESS - DANG DAY CODE LEN GITHUB REPO
echo   Repository: https://github.com/RyanNguyen0411/kiem-soat-van-hanh
echo ========================================================
echo.
echo [1/2] Kiem tra nhanh Git hien tai:
git branch
echo.
echo [2/2] Dang tien hanh day nhanh 'main' len GitHub...
echo * Luu y: Neu co hop thoai trinh duyet bat len yeu cau dang nhap GitHub,
echo   anh chi can bam "Sign in with your browser" de xac thuc 1 lan duy nhat.
echo.
git push -u origin main
echo.
if %errorlevel% equ 0 (
    echo ========================================================
    echo   [HOAN TAT] Code da duoc day len GitHub thanh cong 100%!
    echo   Bay gio AM Huy hay vao lai Vercel va bam nut DEPLOY lai nhe!
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo   [CHUA THANH CONG] Gap loi khi ket noi voi GitHub.
    echo ========================================================
)
echo.
pause
