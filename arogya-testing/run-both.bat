@echo off
echo Starting backend and frontend...

REM Start the backend server
start cmd /k "cd D:\dyphackathon\aarogya-backend && python -c "from app import app; app.run(host='0.0.0.0', port=5000)""

echo Waiting for backend to start...
timeout /t 3 /nobreak

REM Start the frontend with EXPO_PUBLIC_USE_LOCAL_BACKEND=true
start cmd /k "cd D:\dyphackathon\arogya-testing\aarogya-app && set EXPO_PUBLIC_USE_LOCAL_BACKEND=true && npx expo start --host lan"

echo Both backend and frontend should be starting now.
echo If you encounter any issues, try running them individually in separate terminals.
