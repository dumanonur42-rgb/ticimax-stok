@echo off
:: Yamansa Sosyal Medya Paneli - ilk kurulum (Windows)
:: 1) Python kontrolu  2) gerekli paketler  3) masaustu kisayolu
setlocal
cd /d "%~dp0"
title Yamansa Panel Kurulum

set PY=
for %%P in (py python) do (
    if not defined PY (
        %%P -c "import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)" >nul 2>&1 && set PY=%%P
    )
)
if not defined PY (
    echo.
    echo  Python 3.10+ bulunamadi.
    echo  https://www.python.org/downloads/windows/ adresinden kurun.
    echo  Kurulumda "Add python.exe to PATH" kutusunu isaretleyin, sonra bu dosyayi tekrar calistirin.
    echo.
    start https://www.python.org/downloads/windows/
    pause
    exit /b 1
)

echo  Paketler kuruluyor...
%PY% -m pip install --upgrade pip >nul
%PY% -m pip install -r panel\requirements.txt
if errorlevel 1 (
    echo  Paket kurulumu basarisiz. Internet baglantisini kontrol edip tekrar deneyin.
    pause
    exit /b 1
)

:: Masaustu kisayolu (pythonw: konsol penceresi acilmaz)
for /f "delims=" %%I in ('%PY% -c "import sys,os;print(os.path.join(os.path.dirname(sys.executable),'pythonw.exe'))"') do set PYW=%%I
if not exist "%PYW%" for /f "delims=" %%I in ('%PY% -c "import sys;print(sys.executable)"') do set PYW=%%I
set SC=%USERPROFILE%\Desktop\Yamansa Panel.lnk
%PY% -c "import subprocess,os;ps=r'''$s=(New-Object -ComObject WScript.Shell).CreateShortcut(r'%SC%');$s.TargetPath=r'%PYW%';$s.Arguments='-m panel';$s.WorkingDirectory=r'%~dp0';$s.IconLocation=r'%~dp0panel\yamansa.ico';$s.Save()''';subprocess.run(['powershell','-NoProfile','-Command',ps])" >nul 2>&1

echo.
echo  Kurulum tamamlandi. Masaustundeki "Yamansa Panel" kisayolundan acabilirsiniz.
echo  Ilk acilista: Hesaplar sayfasi ^> "Tarayiciyi kur" ^> Facebook / Instagram giris.
echo  Zamanlayici sayfasi ^> "Otomatik baslatmayi kur" ile panel kapaliyken de paylasim atilir.
echo.
%PYW% -m panel
exit /b 0
