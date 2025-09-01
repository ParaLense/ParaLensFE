@echo off
echo Installing Template Generator Dependencies...
echo.

REM Install basic requirements
pip install Pillow
pip install numpy
pip install opencv-python
pip install pyautogui
pip install pygetwindow

REM Install Windows-specific requirements
pip install pywin32

echo.
echo Installation complete!
echo You can now run: python main.py
pause
