/**
 * API configuration for BKSDA Superapp
 * Reads environment variables prefixed with EXPO_PUBLIC_
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV || 'development';

if (!API_URL) {
  const errorMsg =
    "Konfigurasi Error: EXPO_PUBLIC_API_URL tidak ditemukan di environment variable.\n" +
    "Silakan buat berkas '.env' di folder 'mobile/' dan tambahkan:\n" +
    "EXPO_PUBLIC_API_URL=http://<IP_KOMPUTER_ANDA>:8000/api";
  
  if (process.env.NODE_ENV !== 'test') {
    console.error(errorMsg);
  }
  
  // Throw a clear developer-friendly error
  throw new Error(errorMsg);
}

export const config = {
  apiUrl: API_URL,
  appEnv: APP_ENV,
  isDev: APP_ENV === 'development',
  isProd: APP_ENV === 'production',
};
