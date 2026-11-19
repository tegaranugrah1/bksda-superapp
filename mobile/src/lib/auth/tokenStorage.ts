import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const LOGGED_OUT_KEY = 'auth_logged_out';
export function shouldRestoreWebSession() {
  try { return typeof window !== 'undefined' && window.localStorage.getItem(LOGGED_OUT_KEY) !== '1'; } catch { return false; }
}
let webToken: string | null = null;
let sessionVersion = 0;
export const getSessionVersion = () => sessionVersion;

/**
 * Saves the authentication token securely.
 */
export async function setToken(token: string): Promise<void> {
  if (typeof token !== 'string' || !token.trim()) throw new Error('Token sesi tidak valid.');
  sessionVersion++;
  try {
    if (Platform.OS === 'web') {
      webToken = token;
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(TOKEN_KEY);
        window.localStorage.removeItem(LOGGED_OUT_KEY);
      }
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to set secure token:', error);
    throw new Error('Gagal menyimpan token keamanan');
  }
}

/**
 * Retrieves the securely stored authentication token.
 */
export async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        // One-time migration: remove the legacy persistent bearer immediately.
        const legacy = window.localStorage.getItem(TOKEN_KEY);
        window.localStorage.removeItem(TOKEN_KEY);
        if (!webToken && legacy && legacy !== 'undefined' && legacy !== 'null') webToken = legacy;
      }
      return webToken;
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get secure token:', error);
    return null;
  }
}

/**
 * Clears the securely stored authentication token.
 */
export async function clearToken(): Promise<void> {
  sessionVersion++;
  webToken = null;
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(TOKEN_KEY);
        window.localStorage.setItem(LOGGED_OUT_KEY, '1');
      }
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to delete secure token:', error);
    throw new Error('Gagal menghapus token keamanan');
  }
}
