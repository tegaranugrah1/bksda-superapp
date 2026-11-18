import { apiClient } from '@/lib/api/client';
import { config } from '@/lib/api/config';

type EventHandler = (payload: unknown) => void;

interface ListenerEntry {
  event: string;
  onEvent: EventHandler;
  onReconnect?: () => void;
}

const DEFAULT_ACTIVITY_TIMEOUT_S = 30;
const MAX_RECONNECT_DELAY_MS = 30_000;

let ws: WebSocket | null = null;
let activeUrl: string | null = null;
let activeToken: string | null = null;
let socketId: string | null = null;
let hasConnectedOnce = false;
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;

const channels = new Map<string, Set<ListenerEntry>>();
const subscribedChannels = new Set<string>();
const rejectedChannels = new Set<string>();
const authorizingChannels = new Set<string>();

export function isReverbSubscribed(channelName: string): boolean {
  return !!ws && ws.readyState === WebSocket.OPEN && !!socketId && subscribedChannels.has(channelName);
}

export function getTokenId(token?: string | null): string | null {
  return token?.match(/^([1-9]\d*)\|[^|\s]+$/)?.[1] ?? null;
}

function readPublicEnv(name: string, inlined?: string): string | undefined {
  return (inlined || process.env[name])?.trim() || undefined;
}

export function getReverbWsUrl(
  appKey = readPublicEnv('EXPO_PUBLIC_REVERB_APP_KEY', process.env.EXPO_PUBLIC_REVERB_APP_KEY)
): string | null {
  if (!appKey) return null;

  let wsScheme = 'ws';
  let wsHost = '127.0.0.1';
  let wsPort = '8080';

  try {
    const parsed = new URL(config.apiUrl);
    wsHost = parsed.hostname;
    if (parsed.protocol === 'https:') {
      wsScheme = 'wss';
      wsPort = parsed.port || '443';
    } else {
      wsScheme = 'ws';
      wsPort = !parsed.port || parsed.port === '8000' ? '8080' : parsed.port;
    }
  } catch {
    // Keep defaults if apiUrl is malformed
  }

  const envHost = readPublicEnv('EXPO_PUBLIC_REVERB_HOST', process.env.EXPO_PUBLIC_REVERB_HOST);
  const envPort = readPublicEnv('EXPO_PUBLIC_REVERB_PORT', process.env.EXPO_PUBLIC_REVERB_PORT);
  const envScheme = readPublicEnv('EXPO_PUBLIC_REVERB_SCHEME', process.env.EXPO_PUBLIC_REVERB_SCHEME)?.toLowerCase();

  if (envHost) {
    const isEnvLocal = envHost === 'localhost' || envHost === '127.0.0.1';
    const isApiLocal = wsHost === 'localhost' || wsHost === '127.0.0.1';
    if (!isEnvLocal || isApiLocal) {
      wsHost = isEnvLocal && isApiLocal ? wsHost : envHost;
    }
  }
  if (envScheme === 'https' || envScheme === 'wss') wsScheme = 'wss';
  if (envScheme === 'http' || envScheme === 'ws') wsScheme = 'ws';
  if (envPort && /^\d+$/.test(envPort)) wsPort = envPort;

  const hidePort =
    (wsScheme === 'wss' && wsPort === '443') ||
    (wsScheme === 'ws' && wsPort === '80');

  return `${wsScheme}://${wsHost}${hidePort ? '' : `:${wsPort}`}/app/${encodeURIComponent(appKey)}?protocol=7&client=js&version=8.4.0&flash=false`;
}

function parseJsonSafe(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function sendFrame(event: string, data: Record<string, unknown> = {}): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ event, data }));
}

function clearTimers(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}

function startPing(activityTimeoutSeconds?: unknown): void {
  if (pingTimer) {
    clearInterval(pingTimer);
  }
  const rawSeconds = Number(activityTimeoutSeconds);
  const seconds = Number.isFinite(rawSeconds) && rawSeconds > 0 ? rawSeconds : DEFAULT_ACTIVITY_TIMEOUT_S;
  const intervalMs = Math.min(Math.max(seconds - 5, 10), 55) * 1000;
  pingTimer = setInterval(() => {
    sendFrame('pusher:ping');
  }, intervalMs);
}

async function authorizeAndSubscribe(channelName: string, currentSocketId: string): Promise<void> {
  if (
    !ws ||
    ws.readyState !== WebSocket.OPEN ||
    socketId !== currentSocketId ||
    rejectedChannels.has(channelName) ||
    !channels.has(channelName)
  ) {
    return;
  }

  const authKey = `${currentSocketId}:${channelName}`;
  if (authorizingChannels.has(authKey)) return;
  authorizingChannels.add(authKey);

  try {
    const response = await apiClient.post<{ data?: { auth?: string }; auth?: string }>(
      '/broadcasting/auth',
      { socket_id: currentSocketId, channel_name: channelName }
    );
    const payload = response.data as { data?: { auth?: string }; auth?: string } | undefined;
    const auth = payload?.data?.auth ?? payload?.auth;

    if (
      auth &&
      ws &&
      ws.readyState === WebSocket.OPEN &&
      socketId === currentSocketId &&
      channels.has(channelName)
    ) {
      sendFrame('pusher:subscribe', { channel: channelName, auth });
    }
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    if (status === 401 || status === 403) {
      rejectedChannels.add(channelName);
    }
  } finally {
    authorizingChannels.delete(authKey);
  }
}

function handleMessage(rawData: unknown): void {
  const msg = parseJsonSafe(rawData) as
    | { event?: string; channel?: string; data?: unknown }
    | null;
  if (!msg || typeof msg.event !== 'string') return;

  if (msg.event === 'pusher:ping') {
    sendFrame('pusher:pong');
    return;
  }

  if (msg.event === 'pusher:connection_established') {
    const data = parseJsonSafe(msg.data) as { socket_id?: string; activity_timeout?: number } | null;
    if (!data?.socket_id) return;

    socketId = data.socket_id;
    const wasReconnect = hasConnectedOnce;
    hasConnectedOnce = true;
    reconnectAttempts = 0;
    startPing(data.activity_timeout);

    for (const channelName of channels.keys()) {
      void authorizeAndSubscribe(channelName, data.socket_id);
    }

    if (wasReconnect) {
      const notified = new Set<() => void>();
      for (const entries of channels.values()) {
        for (const entry of entries) {
          if (entry.onReconnect && !notified.has(entry.onReconnect)) {
            notified.add(entry.onReconnect);
            entry.onReconnect();
          }
        }
      }
    }
    return;
  }

  if (msg.event === 'pusher_internal:subscription_succeeded' && msg.channel) {
    if (channels.has(msg.channel)) subscribedChannels.add(msg.channel);
    return;
  }

  if (msg.event.startsWith('pusher:') || msg.event.startsWith('pusher_internal:')) {
    return;
  }

  if (!msg.channel) return;
  const entries = channels.get(msg.channel);
  if (!entries) return;

  const incomingEvent = msg.event.replace(/^\./, '');
  const payload = parseJsonSafe(msg.data);
  for (const entry of entries) {
    if (entry.event.replace(/^\./, '') === incomingEvent) {
      entry.onEvent(payload);
    }
  }
}

function teardownSocket(): void {
  clearTimers();
  socketId = null;
  subscribedChannels.clear();
  if (ws) {
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    try {
      ws.close();
    } catch {
      // Safe close
    }
    ws = null;
  }
}

function ensureConnected(token: string): void {
  if (typeof WebSocket === 'undefined') return;
  if (channels.size === 0) return;

  const url = getReverbWsUrl();
  if (!url) return;

  if (activeToken !== token || activeUrl !== url) {
    teardownSocket();
    hasConnectedOnce = false;
    reconnectAttempts = 0;
    rejectedChannels.clear();
    activeToken = token;
    activeUrl = url;
  }

  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  const socket = new WebSocket(url);
  ws = socket;

  socket.onmessage = (event) => {
    if (ws !== socket) return;
    handleMessage(event.data);
  };

  socket.onerror = () => {
    // Wait for onclose to schedule backoff reconnect cleanly
  };

  socket.onclose = () => {
    if (ws !== socket) return;
    clearTimers();
    socketId = null;
    subscribedChannels.clear();
    ws = null;

    if (channels.size > 0 && activeToken && activeUrl) {
      const delay = Math.min(2000 * 2 ** reconnectAttempts, MAX_RECONNECT_DELAY_MS);
      reconnectAttempts += 1;
      const tokenSnapshot = activeToken;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (activeToken === tokenSnapshot) {
          ensureConnected(tokenSnapshot);
        }
      }, delay);
    }
  };
}

export function subscribeReverbChannel(
  token: string,
  channelName: string,
  eventName: string,
  onEvent: EventHandler,
  onReconnect?: () => void
): () => void {
  const entry: ListenerEntry = { event: eventName, onEvent, onReconnect };
  let set = channels.get(channelName);
  const isNewChannel = !set;
  if (!set) {
    set = new Set();
    channels.set(channelName, set);
  }
  set.add(entry);

  ensureConnected(token);
  if (isNewChannel && socketId && ws?.readyState === WebSocket.OPEN) {
    void authorizeAndSubscribe(channelName, socketId);
  }

  return () => {
    const current = channels.get(channelName);
    if (!current) return;
    current.delete(entry);
    if (current.size === 0) {
      channels.delete(channelName);
      subscribedChannels.delete(channelName);
      rejectedChannels.delete(channelName);
      sendFrame('pusher:unsubscribe', { channel: channelName });
    }
    if (channels.size === 0) {
      teardownSocket();
    }
  };
}

export function disconnectReverb(): void {
  channels.clear();
  rejectedChannels.clear();
  authorizingChannels.clear();
  hasConnectedOnce = false;
  reconnectAttempts = 0;
  activeToken = null;
  activeUrl = null;
  teardownSocket();
}
