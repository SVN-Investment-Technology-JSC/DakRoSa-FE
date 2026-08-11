import { apiClient } from './client';

/**
 * Danh bạ người dùng — nguồn cho các ô chọn người ở Sơ đồ Tổ chức.
 * Cả hai endpoint đòi quyền `org.manage`.
 */
export interface ApiUser {
  id: string;
  email: string;
  fullName: string;
  avatarInitials?: string;
  roleNames: string[];
}

export function getUsers(search?: string): Promise<ApiUser[]> {
  return apiClient
    .get('/users', { params: search?.trim() ? { search: search.trim() } : {} })
    .then((r) => r.data);
}

export function createUser(dto: {
  email: string;
  fullName: string;
  password: string;
  /** Bỏ trống thì backend gán `approver`. */
  roleNames?: string[];
}): Promise<ApiUser> {
  return apiClient.post('/users', dto).then((r) => r.data);
}
