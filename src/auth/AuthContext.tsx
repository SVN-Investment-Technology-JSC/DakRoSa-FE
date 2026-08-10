import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthUser, login as loginRequest } from '../api/auth';
import {
  API_BASE_URL,
  clearTokens,
  getAccessToken,
  registerUnauthorizedHandler,
  setTokens,
} from '../api/client';

const USER_STORAGE_KEY = 'workflowengine.user';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** Toàn bộ khu Quản trị Admin gated sau cờ này. */
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function loadStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() =>
    getAccessToken() ? loadStoredUser() : null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    clearTokens();
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(logout);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await loginRequest(email, password);
      setTokens(response.accessToken, response.refreshToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
      setUser(response.user);
    } catch (err: any) {
      // No `response` at all means the request never reached the server. Saying
      // "check your credentials" there sends people hunting for a wrong password
      // when the API is simply not running.
      if (!err?.response) {
        setError(
          `Không kết nối được tới máy chủ (${API_BASE_URL}). ` +
            'Backend chưa chạy — mở thư mục backend/ và chạy "npm run start:dev".',
        );
        throw err;
      }
      const message =
        err.response.data?.message ?? 'Đăng nhập thất bại. Vui lòng kiểm tra email và mật khẩu.';
      setError(Array.isArray(message) ? message.join(', ') : message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isAdmin: (user?.roles ?? []).includes('admin'),
      isLoading,
      error,
      login,
      logout,
    }),
    [user, isLoading, error, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
