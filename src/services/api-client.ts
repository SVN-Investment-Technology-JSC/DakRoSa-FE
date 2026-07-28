import type { AuthPayload } from '@/types/auth';
import type { ApiEnvelope, ApiErrorEnvelope, ApiRequestOptions } from '@/types/api';
import { demoDataForMissingGet, withDemoData } from '@/lib/demo-data';
import { ApiError } from './service-error';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

let accessToken: string | null = null;
let refreshPromise: Promise<AuthPayload> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const payload = (await response.json()) as ApiEnvelope<T> | ApiErrorEnvelope;
  if (!response.ok || !payload.success) {
    const error = !payload.success
      ? payload.error
      : { code: 'REQUEST_ERROR', message: 'Yêu cầu thất bại.' };
    const message = Array.isArray(error.message) ? error.message.join(' ') : error.message;
    throw new ApiError(message, response.status, error.code);
  }
  return payload.data;
}

export async function restoreSession(): Promise<AuthPayload> {
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
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.auth !== false && accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
  if (response.status === 401 && options.retryUnauthorized !== false && !path.startsWith('/auth/')) {
    await restoreSession();
    return apiRequest<T>(path, init, { ...options, retryUnauthorized: false });
  }
  try {
    return withDemoData(path, await parseResponse<T>(response)) as T;
  } catch (error) {
    const isGetRequest = !init.method || init.method.toUpperCase() === 'GET';
    const demo = isGetRequest && error instanceof ApiError && error.status === 404
      ? demoDataForMissingGet(path)
      : undefined;
    if (demo !== undefined) return demo as T;
    throw error;
  }
}
