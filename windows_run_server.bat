@echo off
cd /d "%~dp0"
set PORT=8000
echo Starting web server at http://localhost:%PORT%/
start "" http://localhost:%PORT%/
python -m http.server %PORT%
pause
