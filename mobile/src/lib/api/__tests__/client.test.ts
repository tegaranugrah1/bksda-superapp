/* eslint-disable @typescript-eslint/no-require-imports */
import * as tokenStorage from '@/lib/auth/tokenStorage';

process.env.EXPO_PUBLIC_API_URL = 'https://api.test.com/api';
const { apiClient } = require('../client');

jest.mock('@/lib/auth/tokenStorage', () => ({
  getToken: jest.fn(),
  clearToken: jest.fn(),
}));

describe('apiClient', () => {
  const mockAdapter = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Inject mock adapter to prevent real network requests
    apiClient.defaults.adapter = mockAdapter;
  });

  it('attaches mandatory headers to requests', async () => {
    mockAdapter.mockResolvedValue({
      data: { id: 1 },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });

    (tokenStorage.getToken as jest.Mock).mockResolvedValue(null);

    await apiClient.get('/test-endpoint');

    expect(mockAdapter).toHaveBeenCalled();
    const requestConfig = mockAdapter.mock.calls[0][0];
    
    // Axios headers can be accessed via requestConfig.headers
    expect(requestConfig.headers.get('Accept')).toBe('application/json');
    expect(requestConfig.headers.get('X-Client')).toBe('mobile');
    expect(requestConfig.headers.get('Authorization')).toBeUndefined();
  });

  it('attaches Authorization header if token is present', async () => {
    mockAdapter.mockResolvedValue({
      data: { id: 2 },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });

    (tokenStorage.getToken as jest.Mock).mockResolvedValue('super-secret-token');

    await apiClient.get('/secure-endpoint');

    expect(mockAdapter).toHaveBeenCalled();
    const requestConfig = mockAdapter.mock.calls[0][0];
    expect(requestConfig.headers.get('Authorization')).toBe('Bearer super-secret-token');
  });

  it('normalizes response payloads on success', async () => {
    mockAdapter.mockResolvedValue({
      data: {
        data: { id: 3, name: 'Normal' },
        message: 'Success load',
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });

    (tokenStorage.getToken as jest.Mock).mockResolvedValue(null);

    const response = await apiClient.get('/success-endpoint');

    // Response data should be normalized
    expect(response.data).toEqual({
      data: { id: 3, name: 'Normal' },
      message: 'Success load',
    });
  });

  it('clears token and normalizes error on 401 unauthorized', async () => {
    const errorResponse = {
      response: {
        status: 401,
        data: { message: 'Token expired' },
        headers: {},
        config: {},
      },
    };
    mockAdapter.mockRejectedValue(errorResponse);

    await expect(apiClient.get('/unauth-endpoint')).rejects.toEqual({
      status: 401,
      message: 'Token expired',
      kind: 'auth',
    });

    // Token must be cleared on 401
    expect(tokenStorage.clearToken).toHaveBeenCalled();
  });

  it('normalizes general errors without clearing token', async () => {
    const errorResponse = {
      response: {
        status: 500,
        data: 'Internal server error',
        headers: {},
        config: {},
      },
    };
    mockAdapter.mockRejectedValue(errorResponse);

    await expect(apiClient.get('/server-error-endpoint')).rejects.toEqual({
      status: 500,
      message: 'Terjadi gangguan pada server. Silakan hubungi admin atau coba lagi nanti.',
      kind: 'server',
    });

    // Token should NOT be cleared for non-401 errors
    expect(tokenStorage.clearToken).not.toHaveBeenCalled();
  });
});
