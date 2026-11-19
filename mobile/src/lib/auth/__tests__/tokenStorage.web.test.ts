import { setToken, getToken, clearToken, shouldRestoreWebSession } from '../tokenStorage';
import * as SecureStore from 'expo-secure-store';
jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));
jest.mock('expo-secure-store', () => ({ setItemAsync: jest.fn(), getItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
const values = new Map<string, string>();
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
beforeAll(() => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  } } });
});
beforeEach(async () => { await clearToken(); values.clear(); jest.clearAllMocks(); });
afterAll(() => {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});
it('keeps browser bearer credentials out of persistent storage', async () => {
  await setToken('42|dummy-secret');
  expect(await getToken()).toBe('42|dummy-secret');
  expect(values.has('auth_token')).toBe(false);
  expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  await clearToken();
  expect(await getToken()).toBeNull();
  expect(shouldRestoreWebSession()).toBe(false);
  await setToken('43|new-dummy-secret');
  expect(shouldRestoreWebSession()).toBe(true);
});
it('migrates a legacy bearer once and removes it immediately', async () => {
  values.set('auth_token', '42|legacy-dummy');
  expect(await getToken()).toBe('42|legacy-dummy');
  expect(values.has('auth_token')).toBe(false);
  expect(await getToken()).toBe('42|legacy-dummy');
});
