import type { Role } from '@/types/rbac';
import type { CreateUserInput, UpdateUserInput, UserListResponse } from '@/types/user';
import { apiRequest } from './api-client';

export const usersService = {
  getUsers: (search = '') => apiRequest<UserListResponse>(`/users?limit=50&search=${encodeURIComponent(search)}`),
  getAssignableRoles: () => apiRequest<Role[]>('/users/assignable-roles'),
  createUser: (input: CreateUserInput) => apiRequest<void>('/users', { method: 'POST', body: JSON.stringify(input) }),
  updateUser: (id: string, input: UpdateUserInput) => apiRequest<void>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  resetPassword: (id: string, newPassword: string) => apiRequest<void>(`/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) }),
  deleteUser: (id: string) => apiRequest<void>(`/users/${id}`, { method: 'DELETE' }),
};
