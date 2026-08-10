import { apiClient } from './client';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarInitials?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password });
  return data;
}

export async function fetchMe(): Promise<{ sub: string; email: string }> {
  const { data } = await apiClient.get('/auth/me');
  return data;
}
