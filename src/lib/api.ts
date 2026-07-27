import { AuthPayload } from '@/types/auth';
import { demoDataForMissingGet, withDemoData } from './demo-data';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

interface ApiEnvelope<T> {
  success: true;
  data: T;
}

interface ApiErrorEnvelope {
  success: false;
  error: { code: string; message: string | string[] };
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

let accessToken: string | null = null;
let refreshPromise: Promise<AuthPayload> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const payload = (await response.json()) as ApiEnvelope<T> | ApiErrorEnvelope;
  if (!response.ok || !payload.success) {
    const error = !payload.success ? payload.error : { code: 'REQUEST_ERROR', message: 'Yêu cầu thất bại.' };
    const message = Array.isArray(error.message) ? error.message.join(' ') : error.message;
    throw new ApiError(message, response.status, error.code);
  }
  return payload.data;
}

async function refreshSession(): Promise<AuthPayload> {
  refreshPromise ??= fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
    .then(parseResponse<AuthPayload>)
    .then((payload) => {
      setAccessToken(payload.accessToken);
      window.dispatchEvent(new CustomEvent('enterprise-portal:session-refreshed', { detail: payload.user }));
      return payload;
    })
    .catch((error) => {
      setAccessToken(null);
      window.dispatchEvent(new Event('enterprise-portal:session-expired'));
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: { retryUnauthorized?: boolean; auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (options.auth !== false && accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
  if (response.status === 401 && options.retryUnauthorized !== false && !path.startsWith('/auth/')) {
    await refreshSession();
    return apiRequest<T>(path, init, { ...options, retryUnauthorized: false });
  }
  try {
    return withDemoData(path, await parseResponse<T>(response)) as T;
  } catch (error) {
    const isGetRequest = !init.method || init.method.toUpperCase() === 'GET';
    const canUseMissingRouteDemo = error instanceof ApiError && error.status === 404;
    const demo = isGetRequest && canUseMissingRouteDemo
      ? demoDataForMissingGet(path)
      : undefined;
    if (demo !== undefined) return demo as T;
    throw error;
  }
}

export const authApi = {
  login: (username: string, password: string) =>
    apiRequest<AuthPayload>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ username, password }) },
      { auth: false, retryUnauthorized: false },
    ),
  restore: refreshSession,
  switchTenant: (tenantSlug: string) =>
    apiRequest<AuthPayload>('/auth/switch-tenant', {
      method: 'POST',
      body: JSON.stringify({ tenantSlug }),
    }),
  logout: () => apiRequest<void>('/auth/logout', { method: 'POST' }, { retryUnauthorized: false }),
};
