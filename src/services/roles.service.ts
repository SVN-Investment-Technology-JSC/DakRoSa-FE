import type { Role, RoleInput, UpdateRoleInput } from '@/types/rbac';
import { apiRequest } from './api-client';

export const rolesService = {
  getRoles: () => apiRequest<Role[]>('/rbac/roles'),
  updatePermissions: (id: string, permissionKeys: string[]) => apiRequest<Role>(`/rbac/roles/${id}/permissions`, { method: 'PUT', body: JSON.stringify({ permissionKeys }) }),
  createRole: (input: RoleInput) => apiRequest<Role>('/rbac/roles', { method: 'POST', body: JSON.stringify(input) }),
  updateRole: (id: string, input: UpdateRoleInput) => apiRequest<Role>(`/rbac/roles/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteRole: (id: string) => apiRequest<void>(`/rbac/roles/${id}`, { method: 'DELETE' }),
};
