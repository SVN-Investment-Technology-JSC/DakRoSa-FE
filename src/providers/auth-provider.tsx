'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, setAccessToken } from '@/lib/api';
import { AuthUser } from '@/types/auth';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (username: string, password: string) => Promise<AuthUser>;
  switchTenant: (tenantSlug: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let active = true;
    const onRefreshed = (event: Event) => {
      if (!active) return;
      const refreshedUser = (event as CustomEvent<AuthUser>).detail;
      setUser(refreshedUser);
      setStatus('authenticated');
    };
    const onExpired = () => {
      if (!active) return;
      setUser(null);
      setStatus('unauthenticated');
    };
    window.addEventListener('enterprise-portal:session-refreshed', onRefreshed);
    window.addEventListener('enterprise-portal:session-expired', onExpired);

    void authApi
      .restore()
      .then((payload) => {
        if (!active) return;
        setUser(payload.user);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setStatus('unauthenticated');
      });

    return () => {
      active = false;
      window.removeEventListener('enterprise-portal:session-refreshed', onRefreshed);
      window.removeEventListener('enterprise-portal:session-expired', onExpired);
    };
  }, []);

  const switchTenant = useCallback(async (tenantSlug: string) => {
    const payload = await authApi.switchTenant(tenantSlug);
    setAccessToken(payload.accessToken);
    setUser(payload.user);
    return payload.user;
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const payload = await authApi.login(username, password);
    setAccessToken(payload.accessToken);
    setUser(payload.user);
    setStatus('authenticated');
    return payload.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, login, switchTenant, logout }),
    [user, status, login, switchTenant, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
