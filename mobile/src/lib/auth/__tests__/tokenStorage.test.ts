import { getToken, setToken, clearToken } from '../tokenStorage';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('tokenStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes setToken which stores value securely', async () => {
    await setToken('test_token');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token', 'test_token');
  });

  it('exposes getToken which retrieves value securely', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('retrieved_token');
    const token = await getToken();
    expect(token).toBe('retrieved_token');
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth_token');
  });

  it('exposes clearToken which deletes value securely', async () => {
    await clearToken();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
  });
});
