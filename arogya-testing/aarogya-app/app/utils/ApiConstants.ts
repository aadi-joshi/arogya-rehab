import * as SecureStore from "expo-secure-store";
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const TOKEN_KEY = "jwt-tokens";

const hasToken = async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    return token !== null;
};

const getJWTToken = async () => {
    return await SecureStore.getItemAsync(TOKEN_KEY);
};

const setJWTToken = async (token: string) => {
    console.log("Setting token: ", token);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
};

const clearJWTToken = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
};

// CONFIGURATION OPTIONS:
// 1. Set this to true to use local backend, false to use production
const USE_LOCAL_BACKEND = true;

// 2. Get your local IP dynamically or use a fallback
const getLocalIP = () => {
    if (Platform.OS === 'web') {
        return window.location.hostname;
    }
    
    // For Android emulator to access host machine's localhost
    if (Platform.OS === 'android') {
        return '10.0.2.2';
    }
    
    // Try to get the IP from environment variables first
    return '192.168.210.201';  // Replace with the IP from your start-local.bat output
};

// Less reliable method: Try to detect environment from Expo config
const isEnvLocalBackend = process.env.EXPO_PUBLIC_USE_LOCAL_BACKEND === 'true' || 
                          Constants.expoConfig?.extra?.isLocalBackend === true;

// Use direct config setting above or fall back to environment detection
const isLocalDevelopment = USE_LOCAL_BACKEND || isEnvLocalBackend;

// The actual base URL to use
const getBaseUrl = () => {
    if (isLocalDevelopment) {
        const ip = getLocalIP();
        return `http://${ip}:5000`;
    } else {
        return 'https://aarogya-backend-production.up.railway.app';
    }
};

// Log which API endpoint we're using (moved outside the class)
const BASE_URL = getBaseUrl();
console.log(`Using API endpoint: ${BASE_URL} (${isLocalDevelopment ? 'LOCAL' : 'PRODUCTION'})`);

export class Api {
    // Use local or production URL based on environment
    static readonly BASE_URL = BASE_URL;
    
    static readonly LOGIN_URL = `${Api.BASE_URL}/login`;
    static readonly REGISTER_URL = `${Api.BASE_URL}/signup`;
    static readonly CURRENT_USER_URL = `${Api.BASE_URL}/user/profile`;
    static readonly LOGOUT_URL = `${Api.BASE_URL}/logout`;
    static readonly CHATBOT_URL = `${Api.BASE_URL}/chat`;
    static readonly UPDATE_USER_URL = `${Api.BASE_URL}/user/profile`;
    static readonly USER_FORM_FILLED_URL = `${Api.BASE_URL}/user/profile/formFilled`;
    static readonly GENERATE_ROADMAP_URL = `${Api.BASE_URL}/user/generate-roadmap`;
    static readonly GENERATE_ROADMAP_FORCE_URL = `${Api.BASE_URL}/user/generate-roadmap-force`;

    // Use the same BASE_URL for exercise endpoints to keep everything consistent
    static readonly EXERCISES_SERVER = Api.BASE_URL;
    static readonly RECORD_EXERCISE_URL = `${Api.EXERCISES_SERVER}/record-exercise`;

    static async buildHeaders() {
        const token = await getJWTToken();

        return {
            "Content-Type": "application/json",
            Authorization: `${token}`,
        };
    }

    static async get(url: string) {
        try {
            console.log("GET request to: ", url);
            const response = await fetch(url, {
                method: "GET",
                headers: await Api.buildHeaders(),
            });
            const responseJson = await response.json();
            console.log("Response: ", responseJson, response.status);
            return { responseJson, status: response.status };
        } catch (error) {
            console.log("Error in get request: ", error);
            return { responseJson: null, status: 500 };
        }
    }

    static async post(url: string, data: any) {
        try {
            console.log("POST request to: ", url);
            const response = await fetch(url, {
                method: "POST",
                headers: await Api.buildHeaders(),
                body: JSON.stringify(data),
            });
            const responseJson = await response.json();
            console.log("Response: ", responseJson, response.status);
            return { responseJson, status: response.status };
        } catch (error) {
            console.log("Error in post request: ", error);
            return { responseJson: null, status: 500 };
        }
    }

    static async logoutUser() {
        await SecureStore.deleteItemAsync("ex-count");
        await clearJWTToken();
    }
}

export { setJWTToken, clearJWTToken, hasToken };
