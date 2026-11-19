import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { User, Employee, LoginResponse } from '@/types/auth';
import { getToken, setToken, clearToken, shouldRestoreWebSession } from '@/lib/auth/tokenStorage';
import { disconnectReverb, getTokenId, isReverbSubscribed, subscribeReverbChannel } from '@/lib/reverb';
import { subscribeSessionEvents, type SecurityRequirement } from '@/lib/auth/sessionEvents';
import { login as loginApi, verifyTwoFactor as verifyTwoFactorApi, getMe as getMeApi, logout as logoutApi } from './authApi';

export interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  token: string | null;
  isLoading: boolean;
  twoFactorChallenge: string | null;
  securityRequirement: SecurityRequirement | null;
  verifyTwoFactor: (code: string) => Promise<void>;
  cancelTwoFactor: () => void;
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
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<string | null>(null);
  const [securityRequirement, setSecurityRequirement] = useState<SecurityRequirement | null>(null);
  const tokenRef = useRef<string | null>(null);
  const refreshingRef = useRef(false);
  const sessionEpoch = useRef(0);

  const applySecurity = (data: User) => setSecurityRequirement(data.security?.must_change_password ? 'must_change_password' : data.security?.must_setup_2fa ? 'must_setup_2fa' : null);
  const endSession = useCallback(() => {
    sessionEpoch.current++;
    tokenRef.current = null; setTokenState(null); setUser(null); setEmployee(null);
    setTwoFactorChallenge(null); setSecurityRequirement(null); disconnectReverb();
  }, []);
  useEffect(() => subscribeSessionEvents(event => {
    if (event.type === 'expired') endSession(); else setSecurityRequirement(event.reason);
  }), [endSession]);

  // Initialize auth state on application startup
  useEffect(() => {
    let mounted = true;
    async function initAuth() {
      const epoch = sessionEpoch.current;
      try {
        const storedToken = await getToken();
        if (storedToken || (Platform.OS === 'web' && shouldRestoreWebSession())) {
          tokenRef.current = storedToken;
          setTokenState(storedToken);
          const userData = await getMeApi();
          if (!mounted || epoch !== sessionEpoch.current) return;
          setUser(userData);
          setEmployee(userData.employee);
          applySecurity(userData);
          const activeToken = await getToken();
          if (mounted && epoch === sessionEpoch.current) { tokenRef.current = activeToken; setTokenState(activeToken); }
        }
      } catch {
        if (!mounted || epoch !== sessionEpoch.current) return;
        // Safe fallback. If token was invalid, apiClient already cleared it.
        setUser(null);
        setEmployee(null);
        setTokenState(null);
        tokenRef.current = null;
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void initAuth();
    return () => { mounted = false; };
  }, []);

  const completeLogin = async (response: LoginResponse) => {
    if (!response.data?.id || !response.token) throw new Error('Sesi autentikasi tidak valid.');
    await setToken(response.token);
    tokenRef.current = response.token; setTokenState(response.token);
    setUser(response.data); setEmployee(response.data.employee); applySecurity(response.data);
    setTwoFactorChallenge(null);
  };
  const login = async (username: string, password?: string) => {
    setTwoFactorChallenge(null);
    const response = await loginApi({ username, password });
    if ('requires_2fa' in response) { setTwoFactorChallenge(response.challenge_token); return; }
    await completeLogin(response);
  };
  const verifyTwoFactor = async (code: string) => {
    if (!twoFactorChallenge) throw new Error('Sesi verifikasi telah berakhir. Silakan login kembali.');
    await completeLogin(await verifyTwoFactorApi(twoFactorChallenge, code));
  };
  const cancelTwoFactor = () => setTwoFactorChallenge(null);

  const logout = async () => {
    sessionEpoch.current++;
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
      endSession();
      setIsLoading(false);
    }
  };

  const refreshUser = useCallback(async () => {
    const currentToken = tokenRef.current;
    const epoch = sessionEpoch.current;
    if ((!currentToken && Platform.OS !== 'web') || refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const userData = await getMeApi();
      if (tokenRef.current !== currentToken || epoch !== sessionEpoch.current) return;
      setUser(userData);
      setEmployee(userData.employee);
      applySecurity(userData);
      const activeToken = await getToken();
      if (epoch === sessionEpoch.current && tokenRef.current === currentToken && activeToken !== currentToken) {tokenRef.current = activeToken;setTokenState(activeToken);}
    } catch (error) {
      if (tokenRef.current !== currentToken || epoch !== sessionEpoch.current) return;
      if ((error as { status?: number })?.status === 401) {
        endSession();
      } else {
        console.warn('Failed to refresh user credentials:', error);
      }
    } finally {
      refreshingRef.current = false;
    }
  }, [endSession]);

  useEffect(() => {
    if (!user?.id || !token || securityRequirement) return;
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
  }, [user?.id, token, refreshUser, securityRequirement]);

  return (
    <AuthContext.Provider
      value={{
        user,
        employee,
        token,
        isLoading,
        login,
        twoFactorChallenge, securityRequirement, verifyTwoFactor, cancelTwoFactor,
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
