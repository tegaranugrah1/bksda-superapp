import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';

/**
 * Saves the authentication token securely.
 */
export async function setToken(token: string): Promise<void> {
  try {
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
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to delete secure token:', error);
    throw new Error('Gagal menghapus token keamanan');
  }
}
