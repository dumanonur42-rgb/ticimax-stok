@echo off
:: Windows'ta tek klasorluk .exe paketi uretir: dist\YamansaPanel\YamansaPanel.exe
cd /d "%~dp0"
py -m pip install -r requirements.txt pyinstaller || python -m pip install -r requirements.txt pyinstaller
py -m PyInstaller --noconfirm --clean YamansaPanel.spec || python -m PyInstaller --noconfirm --clean YamansaPanel.spec
echo.
echo  Bitti: %~dp0dist\YamansaPanel\YamansaPanel.exe
pause
