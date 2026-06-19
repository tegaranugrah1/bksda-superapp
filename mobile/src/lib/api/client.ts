import axios from 'axios';
import { config } from './config';
import { getToken, clearToken } from '@/lib/auth/tokenStorage';
import { normalizeResponse } from './normalize';
import { normalizeError } from './errors';

// Create the central Axios instance
export const apiClient = axios.create({
  baseURL: config.apiUrl,
  timeout: 15000,
});

// Request interceptor to attach authentication token and mandatory headers
apiClient.interceptors.request.use(
  async (reqConfig) => {
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
    response.data = normalizeResponse(response.data);
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
    if (normalized.status === 401) {
      try {
        await clearToken();
      } catch (tokenError) {
        if (config.isDev) {
          console.error('[API Client] Failed to clear token on 401 unauthorized', tokenError);
        }
      }
    }

    return Promise.reject(normalized);
  }
);
