import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Employee } from '@/types/auth';
import { getToken, setToken, clearToken } from '@/lib/auth/tokenStorage';
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize auth state on application startup
  useEffect(() => {
    async function initAuth() {
      try {
        const storedToken = await getToken();
        if (storedToken) {
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
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (username: string, password?: string) => {
    // Note: Do NOT set global isLoading = true here.
    // Toggling global isLoading unmounts LoginScreen in RootNavigation,
    // which discards LoginScreen's state and prevents error banners/alerts from displaying.
    try {
      const response = await loginApi({ username, password });
      const userObj = response.data;
      const responseToken = response.token;

      await setToken(responseToken);
      setTokenState(responseToken);
      setUser(userObj);
      setEmployee(userObj.employee);
    } catch (error) {
      // Safe cleanup on login failures
      setUser(null);
      setEmployee(null);
      setTokenState(null);
      throw error;
    }
  };

  const logout = async () => {
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
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await getMeApi();
      setUser(userData);
      setEmployee(userData.employee);
    } catch (error) {
      console.warn('Failed to refresh user credentials:', error);
    }
  };

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
