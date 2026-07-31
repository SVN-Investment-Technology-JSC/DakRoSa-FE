import type {
  CreateOrganizationUnitInput,
  CreatePositionInput,
  CreateSiteInput,
  Organization,
  OrganizationRecordKind,
  TenancyBootstrap,
  UpdateTenantSettingsInput,
} from '@/types/tenancy';
import { apiRequest } from './api-client';

export const tenancyService = {
  getOrganization: () => apiRequest<Organization>('/tenancy/organization'),
  createUnit: (input: CreateOrganizationUnitInput) => apiRequest<void>('/tenancy/organization/units', { method: 'POST', body: JSON.stringify(input) }),
  createPosition: (input: CreatePositionInput) => apiRequest<void>('/tenancy/organization/positions', { method: 'POST', body: JSON.stringify(input) }),
  deactivateOrganizationRecord: (kind: OrganizationRecordKind, id: string) => apiRequest<void>(`/tenancy/organization/${kind}/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive: false }) }),
  getSettings: () => apiRequest<TenancyBootstrap>('/tenancy/settings'),
  updateSettings: (input: UpdateTenantSettingsInput) => apiRequest<void>('/tenancy/settings', { method: 'PATCH', body: JSON.stringify(input) }),
  createSite: (input: CreateSiteInput) => apiRequest<void>('/tenancy/sites', { method: 'POST', body: JSON.stringify(input) }),
  setSiteActive: (id: string, isActive: boolean) => apiRequest<void>(`/tenancy/sites/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
};
