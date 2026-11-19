import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AuthContext, type AuthContextType } from '@/features/auth/AuthProvider';
import { useReverbRefresh } from '@/hooks/useReverbRefresh';
import { apiClient } from '@/lib/api/client';
import {
  disconnectReverb,
  getReverbWsUrl,
  getTokenId,
  isReverbSubscribed,
  subscribeReverbChannel,
} from '@/lib/reverb';

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

const mockConfig = {
  apiUrl: 'http://localhost:8000/api',
  appEnv: 'development',
  isDev: true,
  isProd: false,
};

jest.mock('@/lib/api/config', () => ({
  get config() {
    return mockConfig;
  },
}));

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  url: string;
  readyState = MockWebSocket.OPEN;
  sent: string[] = [];
  onopen: ((ev?: unknown) => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onerror: ((ev?: unknown) => void) | null = null;
  onclose: ((ev?: unknown) => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.closed = true;
  }

  emitMessage(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }
}

describe('reverb client & useReverbRefresh', () => {
  const originalEnv = process.env;
  const originalWebSocket = (globalThis as { WebSocket?: unknown }).WebSocket;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    MockWebSocket.instances = [];
    process.env = { ...originalEnv, EXPO_PUBLIC_REVERB_APP_KEY: 'bksda-superapp-reverb-key' };
    mockConfig.apiUrl = 'http://localhost:8000/api';
    (globalThis as { WebSocket: unknown }).WebSocket = MockWebSocket;
  });

  afterEach(() => {
    disconnectReverb();
    jest.useRealTimers();
    process.env = originalEnv;
    (globalThis as { WebSocket?: unknown }).WebSocket = originalWebSocket;
  });

  it('extracts Sanctum token IDs and rejects malformed tokens', () => {
    expect(getTokenId('42|abcDEF123')).toBe('42');
    expect(getTokenId('0|invalid')).toBeNull();
    expect(getTokenId('plain-token')).toBeNull();
    expect(getTokenId(null)).toBeNull();
  });

  it('builds ws/wss URLs from apiUrl and returns null without app key', () => {
    expect(getReverbWsUrl('')).toBeNull();
    expect(getReverbWsUrl('my-key')).toBe(
      'ws://localhost:8080/app/my-key?protocol=7&client=js&version=8.4.0&flash=false'
    );

    mockConfig.apiUrl = 'https://api.bksdakaltim.web.id/api';
    expect(getReverbWsUrl('my-key')).toBe(
      'wss://api.bksdakaltim.web.id/app/my-key?protocol=7&client=js&version=8.4.0&flash=false'
    );
  });

  it('does not downgrade a secure API connection when ws is configured', () => {
    mockConfig.apiUrl = 'https://api.example.test/api';
    process.env.EXPO_PUBLIC_REVERB_SCHEME = 'ws';
    expect(getReverbWsUrl('dummy-key')).toMatch(/^wss:/);
  });

  it('authorizes private channel, dispatches events, and respects 403 rejection', async () => {
    (apiClient.post as jest.Mock)
      .mockResolvedValueOnce({ data: { data: { auth: 'key:sig123' } } })
      .mockRejectedValueOnce({ status: 403 });

    const onEvent = jest.fn();
    const unsub1 = subscribeReverbChannel(
      '12|secret',
      'private-App.Models.User.7.12',
      'notification.created',
      onEvent
    );
    const unsub2 = subscribeReverbChannel(
      '12|secret',
      'private-admin.inbox.bmn.12',
      'inbox.changed',
      jest.fn()
    );

    expect(MockWebSocket.instances).toHaveLength(1);
    const sock = MockWebSocket.instances[0];

    sock.emitMessage({
      event: 'pusher:connection_established',
      data: JSON.stringify({ socket_id: '100.200', activity_timeout: 30 }),
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(apiClient.post).toHaveBeenCalledWith('/broadcasting/auth', {
      socket_id: '100.200',
      channel_name: 'private-App.Models.User.7.12',
    });
    expect(sock.sent).toContain(
      JSON.stringify({
        event: 'pusher:subscribe',
        data: { channel: 'private-App.Models.User.7.12', auth: 'key:sig123' },
      })
    );

    expect(isReverbSubscribed('private-App.Models.User.7.12')).toBe(false);
    sock.emitMessage({ event: 'pusher_internal:subscription_succeeded',
      channel: 'private-App.Models.User.7.12', data: '{}' });
    expect(isReverbSubscribed('private-App.Models.User.7.12')).toBe(true);
    expect(isReverbSubscribed('private-admin.inbox.bmn.12')).toBe(false);

    sock.emitMessage({
      event: 'notification.created',
      channel: 'private-App.Models.User.7.12',
      data: JSON.stringify({ id: 99, type: 'cuti' }),
    });
    expect(onEvent).toHaveBeenCalledWith({ id: 99, type: 'cuti' });

    unsub1();
    expect(isReverbSubscribed('private-App.Models.User.7.12')).toBe(false);
    unsub2();
    expect(sock.closed).toBe(true);
  });

  it('subscribes allowed channels via useReverbRefresh and debounces bursts', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { data: { auth: 'key:sig456' } },
    });

    const onRefresh = jest.fn();
    const authValue: AuthContextType = {
      user: {
        id: 5,
        name: 'Pegawai Biasa',
        username: '19900101',
        email: 'pegawai@test.local',
        role: 'user',
        access_modules: [],
        permissions: [],
        is_active: true,
        employee: null,
      },
      employee: null,
      token: '77|tokenvalue',
      isLoading: false,
      twoFactorChallenge: null, securityRequirement: null, verifyTwoFactor: jest.fn(), cancelTwoFactor: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    };

    const Harness = () => {
      useReverbRefresh(['user', 'admin:surat_tugas'], onRefresh);
      return null;
    };

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <AuthContext.Provider value={authValue}>
          <Harness />
        </AuthContext.Provider>
      );
    });

    const sock = MockWebSocket.instances[0];
    sock.emitMessage({
      event: 'pusher:connection_established',
      data: JSON.stringify({ socket_id: '55.66', activity_timeout: 30 }),
    });

    await Promise.resolve();
    await Promise.resolve();

    act(() => {
      tree.update(<AuthContext.Provider value={{ ...authValue, user: { ...authValue.user!, name: 'Updated Name' } }}>
        <Harness />
      </AuthContext.Provider>);
    });
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(sock.closed).toBe(false);
    expect(sock.sent.some(frame => JSON.parse(frame).event === 'pusher:unsubscribe')).toBe(false);

    // Non-admin user should only authorize personal channel, not admin:surat_tugas
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(apiClient.post).toHaveBeenCalledWith('/broadcasting/auth', {
      socket_id: '55.66',
      channel_name: 'private-App.Models.User.5.77',
    });

    sock.emitMessage({
      event: 'notification.created',
      channel: 'private-App.Models.User.5.77',
      data: { id: 1 },
    });
    sock.emitMessage({
      event: 'notification.created',
      channel: 'private-App.Models.User.5.77',
      data: { id: 2 },
    });

    expect(onRefresh).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);

    act(() => {
      tree.unmount();
    });
    expect(sock.closed).toBe(true);
  });

  it('reconnects with backoff and subscribes admin channels for super_admin', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { data: { auth: 'key:sig789' } },
    });

    const onRefresh = jest.fn();
    const authValue: AuthContextType = {
      user: {
        id: 1,
        name: 'Super Admin',
        username: 'superadmin',
        email: 'admin@test.local',
        role: 'super_admin',
        access_modules: [],
        permissions: [],
        is_active: true,
        employee: null,
      },
      employee: null,
      token: '88|admintoken',
      isLoading: false,
      twoFactorChallenge: null, securityRequirement: null, verifyTwoFactor: jest.fn(), cancelTwoFactor: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    };

    const Harness = () => {
      useReverbRefresh(['admin:surat_tugas'], onRefresh);
      return null;
    };

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <AuthContext.Provider value={authValue}>
          <Harness />
        </AuthContext.Provider>
      );
    });

    const firstSock = MockWebSocket.instances[0];
    firstSock.emitMessage({
      event: 'pusher:connection_established',
      data: JSON.stringify({ socket_id: '11.22', activity_timeout: 30 }),
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(apiClient.post).toHaveBeenCalledWith('/broadcasting/auth', {
      socket_id: '11.22',
      channel_name: 'private-admin.inbox.surat_tugas.88',
    });

    // Simulate connection drop and exponential backoff reconnect (2s)
    firstSock.emitMessage({ event: 'pusher_internal:subscription_succeeded',
      channel: 'private-admin.inbox.surat_tugas.88', data: '{}' });
    expect(isReverbSubscribed('private-admin.inbox.surat_tugas.88')).toBe(true);
    firstSock.onclose?.();
    expect(isReverbSubscribed('private-admin.inbox.surat_tugas.88')).toBe(false);
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(MockWebSocket.instances).toHaveLength(2);
    const secondSock = MockWebSocket.instances[1];
    secondSock.emitMessage({
      event: 'pusher:connection_established',
      data: JSON.stringify({ socket_id: '33.44', activity_timeout: 30 }),
    });
    await Promise.resolve();
    await Promise.resolve();

    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);

    secondSock.emitMessage({
      event: 'inbox.changed',
      channel: 'private-admin.inbox.surat_tugas.88',
      data: { module: 'surat_tugas', action: 'created' },
    });
    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(onRefresh).toHaveBeenCalledTimes(2);

    // Revoking access must still remove the corresponding admin subscription.
    act(() => {
      tree.update(<AuthContext.Provider value={{ ...authValue, user: { ...authValue.user!, role: 'user' } }}>
        <Harness />
      </AuthContext.Provider>);
    });
    expect(secondSock.closed).toBe(true);

    act(() => {
      tree.unmount();
    });
  });
});
