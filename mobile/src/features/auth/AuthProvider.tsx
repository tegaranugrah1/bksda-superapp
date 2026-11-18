import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { User, Employee } from '@/types/auth';
import { getToken, setToken, clearToken } from '@/lib/auth/tokenStorage';
import { disconnectReverb, getTokenId, isReverbSubscribed, subscribeReverbChannel } from '@/lib/reverb';
import { login as loginApi, getMe as getMeApi, logout as logoutApi } from './authApi';

export interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const tokenRef = useRef<string | null>(null);
  const refreshingRef = useRef(false);

  // Initialize auth state on application startup
  useEffect(() => {
    async function initAuth() {
      try {
        const storedToken = await getToken();
        if (storedToken) {
          tokenRef.current = storedToken;
          setTokenState(storedToken);
          const userData = await getMeApi();
          setUser(userData);
          setEmployee(userData.employee);
        }
      } catch {
        // Safe fallback. If token was invalid, apiClient already cleared it.
        setUser(null);
        setEmployee(null);
        setTokenState(null);
        tokenRef.current = null;
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (username: string, password?: string) => {
    const response = await loginApi({ username, password });
    await setToken(response.token);
    tokenRef.current = response.token;
    setTokenState(response.token);
    setUser(response.data);
    setEmployee(response.data.employee);
  };

  const logout = async () => {
    tokenRef.current = null;
    setIsLoading(true);
    try {
      await logoutApi();
    } catch (error) {
      // Non-blocking log, since token might already be expired on server
      console.warn('API logout failed, proceeding with local cleanup:', error);
    } finally {
      // Local cleanup must ALWAYS happen regardless of API request status
      try {
        await clearToken();
      } catch (tokenError) {
        console.error('Failed to delete secure token during logout:', tokenError);
      }
      setTokenState(null);
      setUser(null);
      setEmployee(null);
      disconnectReverb();
      setIsLoading(false);
    }
  };

  const refreshUser = useCallback(async () => {
    const currentToken = tokenRef.current;
    if (!currentToken || refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const userData = await getMeApi();
      if (tokenRef.current !== currentToken) return;
      setUser(userData);
      setEmployee(userData.employee);
    } catch (error) {
      if (tokenRef.current !== currentToken) return;
      if ((error as { status?: number })?.status === 401) {
        tokenRef.current = null;
        setTokenState(null);
        setUser(null);
        setEmployee(null);
        disconnectReverb();
      } else {
        console.warn('Failed to refresh user credentials:', error);
      }
    } finally {
      refreshingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!user?.id || !token) return;
    const syncUser = () => { void refreshUser(); };
    const tokenId = getTokenId(token);
    const channelName = tokenId ? `private-App.Models.User.${user.id}.${tokenId}` : null;
    const unsubscribe = channelName
      ? subscribeReverbChannel(token, channelName, 'access.updated', syncUser, syncUser)
      : undefined;
    const foreground = AppState.addEventListener('change', state => {
      if (state === 'active') syncUser();
    });
    // Recover missed events when the socket or Reverb service is unavailable.
    const interval = setInterval(() => {
      if (AppState.currentState === 'active' && (!channelName || !isReverbSubscribed(channelName))) syncUser();
    }, 30_000);

    return () => {
      unsubscribe?.();
      foreground.remove();
      clearInterval(interval);
    };
  }, [user?.id, token, refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        employee,
        token,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useOptionalAuth = (): AuthContextType | null => {
  return useContext(AuthContext) ?? null;
};
