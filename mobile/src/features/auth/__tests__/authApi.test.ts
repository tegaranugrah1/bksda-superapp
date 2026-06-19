import { login, getMe, logout } from '../authApi';
import { apiClient } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

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
});
