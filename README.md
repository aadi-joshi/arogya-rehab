# Arogya - Your Personal Virtual Rehabilitation Assisstant

## By Aadi Joshi, Hasan Rupawalla and Kabir Khanuja 

## How to run

### Step 1: Running the storage backend (locally)
```bash
cd aarogya-backend
pip install -r requirements_all.txt
python -c "from app import app; app.run(host='0.0.0.0', port=5000)"
```

### Step 2: Running the mediapipe backend (locally)
```bash
cd aarogya-backend/exercises_web
pip install -r requirements.txt
python app.py
```

### Step 3: Running the app with Expo
```bash
cd arogya-testing/aarogya-app
npm i

# On Windows
.\start-local.bat

# On Mac/Linux
npm run start-with-backend
```

