import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AuthProvider, useAuth } from '../AuthProvider';
import * as tokenStorage from '@/lib/auth/tokenStorage';
import * as authApi from '../authApi';
import { isReverbSubscribed, subscribeReverbChannel } from '@/lib/reverb';
import { notifySession } from '@/lib/auth/sessionEvents';
import { AppState } from 'react-native';

jest.mock('@/lib/reverb', () => ({
  disconnectReverb: jest.fn(),
  isReverbSubscribed: jest.fn(() => false),
  getTokenId: (token: string) => token.match(/^(\d+)\|/)?.[1] ?? null,
  subscribeReverbChannel: jest.fn(() => jest.fn()),
}));

jest.mock('@/lib/auth/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
  shouldRestoreWebSession: jest.fn(() => false),
}));

jest.mock('../authApi', () => ({
  login: jest.fn(),
  verifyTwoFactor: jest.fn(),
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
    (isReverbSubscribed as jest.Mock).mockReturnValue(false);
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

  it('updates modules from a private access event and restores the same session after remount', async () => {
    const token = '42|dummy-mobile-token';
    (tokenStorage.getToken as jest.Mock).mockResolvedValue(token);
    (authApi.getMe as jest.Mock).mockResolvedValue(mockUser);
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<AuthProvider><TestConsumer /></AuthProvider>);
      await flushPromises();
    });

    const updatedUser = { ...mockUser, access_modules: ['kepegawaian', 'inventory'] };
    (authApi.getMe as jest.Mock).mockResolvedValue(updatedUser);
    expect(subscribeReverbChannel).toHaveBeenCalledWith(
      token, 'private-App.Models.User.1.42', 'access.updated', expect.any(Function), expect.any(Function)
    );
    const onAccessChanged = (subscribeReverbChannel as jest.Mock).mock.calls[0][3];
    await act(async () => { onAccessChanged(); await flushPromises(); });
    expect(capturedAuth.user.access_modules).toEqual(updatedUser.access_modules);
    expect(capturedAuth.token).toBe(token);
    expect(tokenStorage.clearToken).not.toHaveBeenCalled();
    act(() => tree.unmount());

    await act(async () => {
      tree = renderer.create(<AuthProvider><TestConsumer /></AuthProvider>);
      await flushPromises();
    });
    expect(capturedAuth.user.access_modules).toEqual(updatedUser.access_modules);
    expect(capturedAuth.token).toBe(token);
    expect(authApi.login).not.toHaveBeenCalled();
    act(() => tree.unmount());
  });

  it('clears active auth state when the server rejects a revoked session', async () => {
    (tokenStorage.getToken as jest.Mock).mockResolvedValue('42|dummy-mobile-token');
    (authApi.getMe as jest.Mock).mockResolvedValue(mockUser);
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<AuthProvider><TestConsumer /></AuthProvider>);
      await flushPromises();
    });
    (authApi.getMe as jest.Mock).mockRejectedValue({ status: 401 });
    await act(async () => { await capturedAuth.refreshUser(); });
    expect(capturedAuth.user).toBeNull();
    expect(capturedAuth.token).toBeNull();
    act(() => tree.unmount());
  });

  it('skips polling when subscribed and recovers access changes when realtime is unavailable', async () => {
    jest.useFakeTimers();
    const previousState = AppState.currentState;
    AppState.currentState = 'active';
    (tokenStorage.getToken as jest.Mock).mockResolvedValue('42|dummy-mobile-token');
    (authApi.getMe as jest.Mock).mockResolvedValue(mockUser);
    let tree!: renderer.ReactTestRenderer;
    try {
      await act(async () => {
        tree = renderer.create(<AuthProvider><TestConsumer /></AuthProvider>);
        await flushPromises();
      });
      (isReverbSubscribed as jest.Mock).mockReturnValue(true);
      await act(async () => {
        jest.advanceTimersByTime(60_000);
        await flushPromises();
      });
      expect(authApi.getMe).toHaveBeenCalledTimes(1);
      expect(isReverbSubscribed).toHaveBeenCalledWith('private-App.Models.User.1.42');
      (isReverbSubscribed as jest.Mock).mockReturnValue(false);
      (authApi.getMe as jest.Mock).mockResolvedValue({ ...mockUser, access_modules: [] });
      await act(async () => {
        jest.advanceTimersByTime(30_000);
        await flushPromises();
      });
      expect(capturedAuth.user.access_modules).toEqual([]);
      expect(capturedAuth.token).toBe('42|dummy-mobile-token');
    } finally {
      act(() => tree.unmount());
      AppState.currentState = previousState;
      jest.useRealTimers();
    }
  });

  it('does not restore an old profile if an in-flight refresh completes after logout', async () => {
    (tokenStorage.getToken as jest.Mock).mockResolvedValue('42|dummy-mobile-token');
    (authApi.getMe as jest.Mock).mockResolvedValue(mockUser);
    (authApi.logout as jest.Mock).mockResolvedValue(undefined);
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<AuthProvider><TestConsumer /></AuthProvider>);
      await flushPromises();
    });
    let finishRefresh!: (value: typeof mockUser) => void;
    (authApi.getMe as jest.Mock).mockReturnValue(new Promise(resolve => { finishRefresh = resolve; }));
    await act(async () => {
      const refresh = capturedAuth.refreshUser();
      await capturedAuth.logout();
      finishRefresh(mockUser);
      await refresh;
    });
    expect(capturedAuth.user).toBeNull();
    expect(capturedAuth.token).toBeNull();
    act(() => tree.unmount());
  });
  it('does not establish a session until the 2FA challenge succeeds', async () => {
    (tokenStorage.getToken as jest.Mock).mockResolvedValue(null);
    (authApi.login as jest.Mock).mockResolvedValue({ requires_2fa: true, challenge_token: 'dummy-challenge' });
    (authApi.verifyTwoFactor as jest.Mock).mockRejectedValueOnce({ status: 422, message: 'Kode tidak valid' })
      .mockResolvedValueOnce({ data: mockUser, token: '42|dummy-token' });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => { tree = renderer.create(<AuthProvider><TestConsumer /></AuthProvider>); await flushPromises(); });
    await act(async () => { await capturedAuth.login('admin', 'dummy-password'); });
    expect(capturedAuth.user).toBeNull(); expect(capturedAuth.token).toBeNull();
    expect(capturedAuth.twoFactorChallenge).toBe('dummy-challenge');
    expect(tokenStorage.setToken).not.toHaveBeenCalled();
    await act(async () => { await expect(capturedAuth.verifyTwoFactor('000000')).rejects.toMatchObject({ status: 422 }); });
    expect(capturedAuth.user).toBeNull();
    await act(async () => { await capturedAuth.verifyTwoFactor('123456'); });
    expect(capturedAuth.user).toEqual(mockUser);
    expect(capturedAuth.twoFactorChallenge).toBeNull();
    expect(tokenStorage.setToken).toHaveBeenCalledWith('42|dummy-token');
    act(() => tree.unmount());
  });

  it('immediately clears portal state for a terminal error from any API caller', async () => {
    (tokenStorage.getToken as jest.Mock).mockResolvedValue('42|dummy-token');
    (authApi.getMe as jest.Mock).mockResolvedValue(mockUser);
    let tree!: renderer.ReactTestRenderer;
    await act(async () => { tree = renderer.create(<AuthProvider><TestConsumer /></AuthProvider>); await flushPromises(); });
    await act(async () => { notifySession({ type: 'blocked', reason: 'must_setup_2fa' }); });
    expect(capturedAuth.securityRequirement).toBe('must_setup_2fa');
    await act(async () => { notifySession({ type: 'expired' }); });
    expect(capturedAuth.user).toBeNull(); expect(capturedAuth.token).toBeNull();
    expect(capturedAuth.securityRequirement).toBeNull();
    act(() => tree.unmount());
  });

});
