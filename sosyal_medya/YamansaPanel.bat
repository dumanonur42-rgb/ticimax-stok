@echo off
:: Yamansa Sosyal Medya Paneli - baslat (kurulumdan sonra)
cd /d "%~dp0"
where pythonw >nul 2>&1 && (start "" pythonw -m panel & exit /b 0)
where pyw >nul 2>&1 && (start "" pyw -m panel & exit /b 0)
py -m panel || python -m panel
