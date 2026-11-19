import { Platform } from 'react-native';
import { apiClient } from '@/lib/api/client';
import { config } from '@/lib/api/config';
import { getSessionVersion, setToken } from '@/lib/auth/tokenStorage';
import { LoginCredentials, LoginResponse, TwoFactorChallenge, User } from '@/types/auth';

function loginResult(body: any): LoginResponse | TwoFactorChallenge {
  const challenge = body?.requires_2fa === true ? body : body?.data?.requires_2fa === true ? body.data : null;
  if (challenge && typeof challenge.challenge_token === 'string' && challenge.challenge_token.trim()) return challenge;
  if (!body?.data?.id || typeof body.token !== 'string' || !body.token.trim()) throw new Error('Respons autentikasi tidak valid.');
  return body;
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse | TwoFactorChallenge> {
  if (Platform.OS === 'web') await apiClient.get(`${new URL(config.apiUrl).origin}/sanctum/csrf-cookie`);
  return loginResult((await apiClient.post('/login', credentials)).data);
}

export async function verifyTwoFactor(challenge_token: string, code: string): Promise<LoginResponse> {
  const result = loginResult((await apiClient.post('/login/2fa', { challenge_token, code })).data);
  if ('requires_2fa' in result) throw new Error('Verifikasi autentikasi belum selesai.');
  return result;
}

export async function getMe(): Promise<User> {
  const version = getSessionVersion();
  const response = Platform.OS === 'web'
    ? await apiClient.get('/me', { params: { sync_realtime_token: 1 }, headers: { 'X-Establish-Mobile-Session': '1' } })
    : await apiClient.get('/me');
  if (Platform.OS === 'web' && response.data.realtime_token && version === getSessionVersion()) await setToken(response.data.realtime_token);
  return response.data.data;
}

export async function logout(): Promise<void> { await apiClient.post('/logout'); }
