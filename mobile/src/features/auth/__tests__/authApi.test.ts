import { login, verifyTwoFactor, getMe, logout } from '../authApi';
import { Platform } from 'react-native';
import { setToken } from '@/lib/auth/tokenStorage';
import { apiClient } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

jest.mock('@/lib/api/config', () => ({ config: { apiUrl: 'https://api.test/api' } }));
jest.mock('@/lib/auth/tokenStorage', () => ({ getSessionVersion: () => 1, setToken: jest.fn() }));

describe('authApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('calls POST /api/login and returns response data', async () => {
      const mockCredentials = { username: 'admin', password: 'password123' };
      const mockResponse = {
        data: {
          data: { id: 1, name: 'Admin User' },
          token: 'auth-token',
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await login(mockCredentials);

      expect(apiClient.post).toHaveBeenCalledWith('/login', mockCredentials);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getMe', () => {
    it('calls GET /api/me and returns user data', async () => {
      const mockResponse = {
        data: {
          data: { id: 1, name: 'Admin User', role: 'admin' },
        },
      };

      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getMe();

      expect(apiClient.get).toHaveBeenCalledWith('/me');
      expect(result).toEqual(mockResponse.data.data);
    });
  });

  describe('logout', () => {
    it('calls POST /api/logout', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });

      await logout();

      expect(apiClient.post).toHaveBeenCalledWith('/logout');
    });
  });
  it('returns normalized first-factor challenges and submits OTP separately', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { data: { requires_2fa: true, challenge_token: 'dummy-challenge' } } });
    await expect(login({ username: 'dummy', password: 'dummy-password' })).resolves.toMatchObject({ requires_2fa: true });
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { data: { id: 1 }, token: '42|dummy-token' } });
    await expect(verifyTwoFactor('dummy-challenge', '123456')).resolves.toMatchObject({ token: '42|dummy-token' });
    expect(apiClient.post).toHaveBeenLastCalledWith('/login/2fa', { challenge_token: 'dummy-challenge', code: '123456' });
  });

  it('rejects malformed login responses instead of storing an undefined token', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { data: { id: 1 } } });
    await expect(login({ username: 'dummy', password: 'dummy-password' })).rejects.toThrow('autentikasi');
  });

  it('bootstraps browser CSRF and restores a memory-only realtime bearer from the cookie session', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    try {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: {} });
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { data: { id: 1 }, token: '42|dummy-token' } });
      await login({ username: 'dummy', password: 'dummy-password' });
      expect(apiClient.get).toHaveBeenCalledWith('https://api.test/sanctum/csrf-cookie');
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: { id: 1 }, realtime_token: '43|dummy-realtime' } });
      await getMe();
      expect(apiClient.get).toHaveBeenLastCalledWith('/me', { params: { sync_realtime_token: 1 }, headers: { 'X-Establish-Mobile-Session': '1' } });
      expect(setToken).toHaveBeenCalledWith('43|dummy-realtime');
    } finally { jest.restoreAllMocks(); }
  });

});
