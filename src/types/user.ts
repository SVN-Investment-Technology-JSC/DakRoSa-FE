import type { Role } from './rbac';

export interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  isPlatformAdmin: boolean;
  shortName: string | null;
  email: string;
  phone: string;
  address: string | null;
  joinedAt: string;
  workShift: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  tenantName: string;
  tenantShortName: string;
  roles: Role[];
}

export interface UserListResponse {
  items: UserRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateUserInput {
  username: string;
  displayName: string;
  shortName: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  roleIds: string[];
  joinedAt: string;
  workShift: string;
}

export type UpdateUserInput = Omit<
  CreateUserInput,
  'username' | 'password' | 'roleIds'
> & {
  isActive: boolean;
  roleIds?: string[];
};
