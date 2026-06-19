import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AuthProvider, useAuth } from '../AuthProvider';
import * as tokenStorage from '@/lib/auth/tokenStorage';
import * as authApi from '../authApi';

jest.mock('@/lib/auth/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
}));

jest.mock('../authApi', () => ({
  login: jest.fn(),
  getMe: jest.fn(),
  logout: jest.fn(),
}));

describe('AuthProvider', () => {
  const mockUser = {
    id: 1,
    name: 'Test Admin',
    username: 'admin',
    email: 'admin@test.com',
    role: 'admin',
    access_modules: ['bmn'],
    permissions: ['view-assets'],
    is_active: true,
    employee: {
      id: 10,
      nip: 'admin',
      name: 'Test Admin Employee',
      position: 'Staff',
      department: 'BMN',
      email: 'admin@test.com',
      phone: '123456',
      photo: null,
      rank: 'III/a',
      is_active: true,
    },
  };

  let capturedAuth: any = null;

  const TestConsumer = () => {
    capturedAuth = useAuth();
    return null;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    capturedAuth = null;
  });

  // Helper to flush all pending microtasks/promises
  const flushPromises = () => new Promise(jest.requireActual('timers').setImmediate);

  it('starts loading and fetches user if token exists', async () => {
    (tokenStorage.getToken as jest.Mock).mockResolvedValue('existing-token');
    (authApi.getMe as jest.Mock).mockResolvedValue(mockUser);

    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    // Wait for the useEffect async operations to resolve
    await act(async () => {
      await flushPromises();
    });

    expect(tokenStorage.getToken).toHaveBeenCalled();
    expect(authApi.getMe).toHaveBeenCalled();
    expect(capturedAuth.isLoading).toBe(false);
    expect(capturedAuth.token).toBe('existing-token');
    expect(capturedAuth.user).toEqual(mockUser);
    expect(capturedAuth.employee).toEqual(mockUser.employee);
    
    // Clean up
    act(() => {
      tree.unmount();
    });
  });

  it('sets states to null if no token is found', async () => {
    (tokenStorage.getToken as jest.Mock).mockResolvedValue(null);

    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    await act(async () => {
      await flushPromises();
    });

    expect(tokenStorage.getToken).toHaveBeenCalled();
    expect(authApi.getMe).not.toHaveBeenCalled();
    expect(capturedAuth.isLoading).toBe(false);
    expect(capturedAuth.token).toBeNull();
    expect(capturedAuth.user).toBeNull();
    expect(capturedAuth.employee).toBeNull();
    
    act(() => {
      tree.unmount();
    });
  });

  it('handles login successfully', async () => {
    (tokenStorage.getToken as jest.Mock).mockResolvedValue(null);
    (authApi.login as jest.Mock).mockResolvedValue({
      data: mockUser,
      token: 'new-login-token',
    });

    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    await act(async () => {
      await flushPromises();
    });

    expect(capturedAuth.isLoading).toBe(false);

    // Trigger login
    await act(async () => {
      await capturedAuth.login('admin', 'password123');
    });

    expect(authApi.login).toHaveBeenCalledWith({ username: 'admin', password: 'password123' });
    expect(tokenStorage.setToken).toHaveBeenCalledWith('new-login-token');
    expect(capturedAuth.token).toBe('new-login-token');
    expect(capturedAuth.user).toEqual(mockUser);
    expect(capturedAuth.employee).toEqual(mockUser.employee);
    
    act(() => {
      tree.unmount();
    });
  });

  it('handles logout and does local cleanup even if API request fails', async () => {
    (tokenStorage.getToken as jest.Mock).mockResolvedValue('active-token');
    (authApi.getMe as jest.Mock).mockResolvedValue(mockUser);
    (authApi.logout as jest.Mock).mockRejectedValue(new Error('Network error on logout'));

    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    await act(async () => {
      await flushPromises();
    });

    expect(capturedAuth.token).toBe('active-token');

    // Trigger logout
    await act(async () => {
      await capturedAuth.logout();
    });

    expect(authApi.logout).toHaveBeenCalled();
    expect(tokenStorage.clearToken).toHaveBeenCalled();
    expect(capturedAuth.token).toBeNull();
    expect(capturedAuth.user).toBeNull();
    expect(capturedAuth.employee).toBeNull();
    
    act(() => {
      tree.unmount();
    });
  });
});
