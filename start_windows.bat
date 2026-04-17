@echo off
SETLOCAL EnableDelayedExpansion
TITLE LungCare AI Workstation - Startup
echo ===================================================
echo   LungCare AI Workstation: Automatic Startup
echo ===================================================
echo.

:: 1. Check for Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please download it from: https://nodejs.org/
    pause
    exit
)

:: 2. Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed!
    echo Please download it from: https://www.python.org/
    echo IMPORTANT: Make sure to check "Add Python to PATH" during installation.
    pause
    exit
)

:: 3. Check for Gemini API Key (.env or .env.local)
if not exist .env (
    if not exist .env.local (
        echo [NOTICE] Missing Gemini API Key for Cloud AI!
        echo You can get a free key at: https://aistudio.google.com/app/apikey
        set /p API_KEY="Please paste your Gemini API Key and press Enter: "
        if not "!API_KEY!"=="" (
            echo GEMINI_API_KEY=!API_KEY! > .env
            echo [SUCCESS] .env file created with your key.
        ) else (
            echo [WARNING] No key entered. Cloud AI will not work.
        )
    )
)

echo [1/3] Installing Website Dependencies...
call npm install --quiet

echo [2/3] Setting up AI Backend...
cd python_backend
if not exist venv (
    echo Creating Virtual Environment...
    python -m venv venv
)
call venv\Scripts\activate
pip install -r requirements.txt --quiet
cd ..

echo [3/3] Starting LungCare Workstation...
echo ---------------------------------------------------
echo The application will open in your browser shortly.
echo KEEP THIS WINDOW OPEN WHILE USING THE APP.
echo ---------------------------------------------------
echo.

:: Start Backend in a new window
start "LungCare AI Backend" cmd /k "cd python_backend && venv\Scripts\activate && python main.py"

:: Start Frontend in this window
npm run dev

pause
