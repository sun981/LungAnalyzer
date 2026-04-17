#!/bin/bash
cd "$(dirname "$0")"

clear
echo "==================================================="
echo "  LungCare AI Workstation: Automatic Startup (Mac)"
echo "==================================================="
echo ""

# 1. Check for Node.js
if ! command -v node &> /dev/null
then
    echo "[ERROR] Node.js is not installed!"
    echo "Please download it from: https://nodejs.org/"
    exit
fi

# 2. Check for Python
if ! command -v python3 &> /dev/null
then
    echo "[ERROR] Python 3 is not installed!"
    echo "Please download it from: https://www.python.org/"
    exit
fi

# 3. Check for Gemini API Key (.env or .env.local)
if [ ! -f .env ] && [ ! -f .env.local ]; then
    echo "[NOTICE] Missing Gemini API Key for Cloud AI!"
    echo "You can get a free key at: https://aistudio.google.com/app/apikey"
    read -p "Please paste your Gemini API Key and press Enter: " API_KEY
    if [ ! -z "$API_KEY" ]; then
        echo "GEMINI_API_KEY=$API_KEY" > .env
        echo "[SUCCESS] .env file created with your key."
    else
        echo "[WARNING] No key entered. Cloud AI will not work."
    fi
fi

echo "[1/3] Installing Website Dependencies..."
npm install --quiet

echo "[2/3] Setting up AI Backend..."
cd python_backend
if [ ! -d "venv" ]; then
    echo "Creating Virtual Environment..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt --quiet
cd ..

echo "[3/3] Starting LungCare Workstation..."
echo "---------------------------------------------------"
echo "The application will open in your browser shortly."
echo "KEEP THIS WINDOW OPEN WHILE USING THE APP."
echo "---------------------------------------------------"
echo ""

# Start Backend in background
source python_backend/venv/bin/activate 2>/dev/null || source python_backend/venv/Scripts/activate 2>/dev/null
python3 python_backend/main.py &

# Start Frontend in foreground
npm run dev
