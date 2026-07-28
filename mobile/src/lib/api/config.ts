/**
 * API configuration for BKSDA Superapp
 * Reads environment variables prefixed with EXPO_PUBLIC_
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.100.176:8000/api';
const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV || 'development';

export const config = {
  apiUrl: API_URL,
  appEnv: APP_ENV,
  isDev: APP_ENV === 'development',
  isProd: APP_ENV === 'production',
};
