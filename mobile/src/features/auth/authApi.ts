import { apiClient } from '@/lib/api/client';
import { LoginCredentials, LoginResponse, User } from '@/types/auth';

/**
 * Sends a POST request to login credentials.
 * Acceptance check: login calls POST /api/login.
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/login', credentials);
  return response.data;
}

/**
 * Sends a GET request to fetch the currently authenticated user details.
 * Acceptance check: me calls GET /api/me.
 */
export async function getMe(): Promise<User> {
  const response = await apiClient.get<User>('/me');
  // response.data is ApiSuccess<User>, so response.data.data is User
  return (response.data as any).data;
}

/**
 * Sends a POST request to log the user out and invalidate the token on backend.
 */
export async function logout(): Promise<void> {
  await apiClient.post('/logout');
}
