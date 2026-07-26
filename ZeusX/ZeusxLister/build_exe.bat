@echo off
REM Build ZeusX Auto-Lister into a single .exe (run this on Windows)

echo Installing dependencies...
python -m pip install playwright customtkinter pyinstaller

echo.
echo Building exe...
python -m PyInstaller --noconfirm --onefile --windowed --collect-all playwright --collect-all customtkinter --name ZeusXAutoLister zeusx_lister_gui.py

if exist "dist\ZeusXAutoLister.exe" (
    echo.
    echo SUCCESS: dist\ZeusXAutoLister.exe
) else (
    echo.
    echo BUILD FAILED - no exe produced. Scroll up to read the error above.
)
pause
