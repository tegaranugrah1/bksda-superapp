import { NativeModules } from 'react-native';

/**
 * API configuration for BKSDA Superapp
 * Automatically resolves local host IP from React Native Bundle URL or environment variable
 */
function getApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Extract host IP dynamically from Expo Metro bundle URL
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  if (scriptURL) {
    const address = scriptURL.split('://')[1]?.split('/')[0];
    const hostname = address?.split(':')[0];
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:8000/api`;
    }
  }

  return 'http://192.168.100.176:8000/api';
}

const API_URL = getApiUrl();
const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV || 'development';

export const config = {
  apiUrl: API_URL,
  appEnv: APP_ENV,
  isDev: APP_ENV === 'development',
  isProd: APP_ENV === 'production',
};
