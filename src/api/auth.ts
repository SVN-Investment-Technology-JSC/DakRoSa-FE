import { apiClient } from './client';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarInitials?: string;
  roles: string[];
  permissions: string[];
  /** Đơn vị nhỏ nhất người này thuộc về — dùng để giới hạn Workspace. */
  orgUnit: { id: string; title: string; level: number } | null;
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

/** Hồ sơ đầy đủ (vai trò + quyền + đơn vị) — không nằm trong JWT, nên đổi vai trò có hiệu lực ngay. */
export async function fetchMe(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>('/auth/me');
  return data;
}
