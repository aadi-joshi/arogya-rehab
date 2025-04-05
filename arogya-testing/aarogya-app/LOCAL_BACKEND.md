# Running with Local Backend

## Setup Instructions

1. First, update your backend server IP address in `app/utils/ApiConstants.ts`:

   ```typescript
   // Find this line and change it to your computer's IP address
   const LOCAL_IP = '192.168.210.201';
   
   // Make sure this is set to true
   const USE_LOCAL_BACKEND = true;
   ```

2. Start your backend server in another terminal:

   ```bash
   cd ../backend
   python -c "from app import app; app.run(host='0.0.0.0', port=5000)"
   ```

3. Start the app using the batch file:

   ```bash
   # On Windows
   start-local.bat
   
   # On Mac/Linux
   npm run start-with-backend
   ```

## Troubleshooting

If you're still having issues:

1. Make sure your backend server is running and accessible
2. Ensure your computer's IP address is correct in ApiConstants.ts
3. Check that your device is on the same network as your computer
4. Try using "localhost" or "127.0.0.1" if you're running on an emulator
5. **Windows PowerShell users**: 
   - When running batch files in PowerShell, you must use `.\start-local.bat` (with the leading `.\`)
   - If you receive execution policy errors, try running PowerShell as Administrator and run:
     ```
     Set-ExecutionPolicy RemoteSigned
     ```
   - Alternatively, use Command Prompt (cmd.exe) instead, where you can run `start-local.bat` directly
6. **If the batch file is missing**: Create the file `start-local.bat` in your project root with these contents:
   ```
   @echo off
   echo Starting Expo with local backend configuration...
   set EXPO_PUBLIC_USE_LOCAL_BACKEND=true
   call expo start --host lan
   ```
