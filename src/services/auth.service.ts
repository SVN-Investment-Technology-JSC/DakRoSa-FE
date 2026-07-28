import type { AuthPayload } from '@/types/auth';
import { apiRequest, restoreSession, setAccessToken } from './api-client';

export const authService = {
  async login(username: string, password: string): Promise<AuthPayload> {
    const payload = await apiRequest<AuthPayload>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ username, password }) },
      { auth: false, retryUnauthorized: false },
    );
    setAccessToken(payload.accessToken);
    return payload;
  },
  restore: restoreSession,
  async switchTenant(tenantSlug: string): Promise<AuthPayload> {
    const payload = await apiRequest<AuthPayload>('/auth/switch-tenant', {
      method: 'POST',
      body: JSON.stringify({ tenantSlug }),
    });
    setAccessToken(payload.accessToken);
    return payload;
  },
  logout: () => apiRequest<void>('/auth/logout', { method: 'POST' }, { retryUnauthorized: false }),
  clearSession: () => setAccessToken(null),
};
