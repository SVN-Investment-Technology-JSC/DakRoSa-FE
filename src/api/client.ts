import axios from 'axios';

const BACKEND_PORT = '3001';

/**
 * Địa chỉ backend, suy ra từ chính host đang mở trang.
 *
 * Mở bằng `localhost` thì gọi `localhost:3001`; mở bằng IP LAN thì gọi đúng IP
 * đó. Để cứng `localhost` là lỗi kinh điển khi chia sẻ trong mạng nội bộ: đồng
 * nghiệp mở `http://192.168.x.x:5173` nhưng trình duyệt của họ lại gọi về máy
 * của chính họ, và cả ứng dụng hỏng ngay ở màn hình đăng nhập.
 *
 * `VITE_API_URL` vẫn ghi đè được, cho trường hợp backend nằm ở máy khác hoặc
 * sau một reverse proxy.
 */
function inferApiBaseUrl(): string {
  if (typeof window === 'undefined') return `http://localhost:${BACKEND_PORT}`;
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:${BACKEND_PORT}`;
}

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? inferApiBaseUrl();

const ACCESS_TOKEN_KEY = 'workflowengine.accessToken';
const REFRESH_TOKEN_KEY = 'workflowengine.refreshToken';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Set by AuthProvider so the interceptor can force a logout on 401 without a circular import. */
let onUnauthorized: (() => void) | null = null;
export function registerUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearTokens();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);
