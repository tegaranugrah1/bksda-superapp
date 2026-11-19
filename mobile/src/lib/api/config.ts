import { NativeModules, Platform } from 'react-native';

const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV || (__DEV__ ? 'development' : 'production');
const REQUIRE_HTTPS = !__DEV__ || APP_ENV === 'production';
function getApiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  let value = configured;
  if (!value && Platform.OS === 'web' && typeof window !== 'undefined') {
    value = window.location.protocol === 'https:' || REQUIRE_HTTPS
      ? `${window.location.origin}/api`
      : `http://${window.location.hostname || '127.0.0.1'}:8000/api`;
  }
  if (!value && !REQUIRE_HTTPS) {
    const script = NativeModules.SourceCode?.scriptURL;
    let host = '127.0.0.1';
    try { if (script) host = new URL(script).hostname || '127.0.0.1'; } catch { /* Local development fallback. */ }
    value = `http://${host}:8000/api`;
  }
  if (!value) throw new Error('EXPO_PUBLIC_API_URL HTTPS wajib disetel untuk build produksi.');
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Konfigurasi alamat API tidak valid.');
  if (url.protocol !== 'https:' && (REQUIRE_HTTPS || (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.protocol === 'https:'))) throw new Error('Koneksi API wajib menggunakan HTTPS.');
  return value.replace(/\/$/, '');
}

export const config = { apiUrl: getApiUrl(), appEnv: APP_ENV, isDev: APP_ENV === 'development', isProd: APP_ENV === 'production' };
