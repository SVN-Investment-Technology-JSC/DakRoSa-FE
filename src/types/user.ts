import { Role } from './rbac';

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
