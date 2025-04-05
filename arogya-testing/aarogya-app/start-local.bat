@echo off
echo Starting Expo with local backend configuration...
set EXPO_PUBLIC_USE_LOCAL_BACKEND=true
call npx expo start --host lan