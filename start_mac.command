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
source python_backend/venv/activate
python3 python_backend/main.py &

# Start Frontend in foreground
npm run dev
