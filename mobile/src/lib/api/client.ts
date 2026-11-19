import axios from 'axios';
import { Platform } from 'react-native';
import { notifySession } from '@/lib/auth/sessionEvents';
import { config } from './config';
import { getToken, clearToken, getSessionVersion } from '@/lib/auth/tokenStorage';
import { normalizeResponse } from './normalize';
import { normalizeError } from './errors';

// Create the central Axios instance
export const apiClient = axios.create({
  baseURL: config.apiUrl,
  timeout: 15000,
  withCredentials: Platform.OS === 'web',
  withXSRFToken: Platform.OS === 'web',
});

// Request interceptor to attach authentication token and mandatory headers
apiClient.interceptors.request.use(
  async (reqConfig) => {
    const target = new URL(reqConfig.url || '', `${config.apiUrl}/`);
    if (target.origin !== new URL(config.apiUrl).origin) throw new Error('Permintaan di luar origin API tidak diizinkan.');
    (reqConfig as typeof reqConfig & { sessionVersion: number }).sessionVersion = getSessionVersion();
    // 1. Set standard headers
    reqConfig.headers.set('Accept', 'application/json');
    reqConfig.headers.set('X-Client', 'mobile');

    // 2. Fetch securely stored auth token and attach if present
    try {
      const token = await getToken();
      if (token) {
        reqConfig.headers.set('Authorization', `Bearer ${token}`);
      }
    } catch (error) {
      // Non-blocking log, fail silently but proceed without token
      if (config.isDev) {
        console.error('[API Client] Failed to retrieve token for request', error);
      }
    }

    // Do NOT log headers or requests containing authentication/token info
    if (config.isDev) {
      console.log(`[API Request] ${reqConfig.method?.toUpperCase()} ${reqConfig.url}`);
    }

    return reqConfig;
  },
  (error) => {
    return Promise.reject(normalizeError(error));
  }
);

// Response interceptor to normalize success payloads and errors
apiClient.interceptors.response.use(
  (response) => {
    if (config.isDev) {
      console.log(`[API Response] Success ${response.config.method?.toUpperCase()} ${response.config.url}`);
    }

    // Normalize response payload into ApiSuccess structure
    if (response.config.responseType !== 'blob' && response.config.responseType !== 'arraybuffer') response.data = normalizeResponse(response.data);
    return response;
  },
  async (error) => {
    const normalized = normalizeError(error);

    if (config.isDev) {
      console.log(
        `[API Response] Error ${error.config?.method?.toUpperCase()} ${error.config?.url} | Status: ${normalized.status} | Kind: ${normalized.kind}`
      );
    }

    // 401 Unauthorized: Clear secure token (do not mix navigation redirects here)
    const sameSession = error.config?.sessionVersion === getSessionVersion();
    if (sameSession && (normalized.status === 401 || normalized.reason === 'account_inactive')) {
      try {
        await clearToken();
      } catch (tokenError) {
        if (config.isDev) {
          console.error('[API Client] Failed to clear token on 401 unauthorized', tokenError);
        }
      } finally { notifySession({ type: 'expired' }); }
    }

    if (sameSession && (normalized.reason === 'must_change_password' || normalized.reason === 'must_setup_2fa')) notifySession({ type: 'blocked', reason: normalized.reason });
    return Promise.reject(normalized);
  }
);
