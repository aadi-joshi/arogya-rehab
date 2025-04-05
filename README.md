# Arogya - Your Personal Virtual Rehabilitation Assisstant

## How to run

### Step 1: Running the backend (locally)
```bash
cd aarogya-backend
pip install -r requirements_all.txt
python -c "from app import app; app.run(host='0.0.0.0', port=5000)"
```

### Step 2: Running the app with Expo
```bash
cd arogya-testing/aarogya-app
npm i

# On Windows
.\start-local.bat

# On Mac/Linux
npm run start-with-backend
```

