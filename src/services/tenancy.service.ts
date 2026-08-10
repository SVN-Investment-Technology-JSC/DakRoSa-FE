import type {
  CreateOrganizationUnitInput,
  CreatePositionInput,
  CreateSiteInput,
  Organization,
  OrganizationRecordKind,
  OrganizationChart,
  CreatePersonnelInput,
  CreatePersonnelAssignmentInput,
  TenancyBootstrap,
  UpdateTenantSettingsInput,
} from '@/types/tenancy';
import { apiRequest } from './api-client';

export const tenancyService = {
  getOrganization: () => apiRequest<Organization>('/tenancy/organization'),
  getOrganizationTree: () => apiRequest<OrganizationChart>('/tenancy/organization/tree'),
  createUnit: (input: CreateOrganizationUnitInput) => apiRequest<void>('/tenancy/organization/units', { method: 'POST', body: JSON.stringify(input) }),
  createPosition: (input: CreatePositionInput) => apiRequest<void>('/tenancy/organization/positions', { method: 'POST', body: JSON.stringify(input) }),
  createPersonnel: (input: CreatePersonnelInput) => apiRequest<void>('/tenancy/organization/personnel', { method: 'POST', body: JSON.stringify(input) }),
  createPersonnelAssignment: (employeeCode: string, input: CreatePersonnelAssignmentInput) => apiRequest<void>(`/tenancy/organization/personnel/${encodeURIComponent(employeeCode)}/assignments`, { method: 'POST', body: JSON.stringify(input) }),
  deactivateOrganizationRecord: (kind: OrganizationRecordKind, id: string) => apiRequest<void>(`/tenancy/organization/${kind}/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive: false }) }),
  getSettings: () => apiRequest<TenancyBootstrap>('/tenancy/settings'),
  updateSettings: (input: UpdateTenantSettingsInput) => apiRequest<void>('/tenancy/settings', { method: 'PATCH', body: JSON.stringify(input) }),
  createSite: (input: CreateSiteInput) => apiRequest<void>('/tenancy/sites', { method: 'POST', body: JSON.stringify(input) }),
  setSiteActive: (id: string, isActive: boolean) => apiRequest<void>(`/tenancy/sites/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
};
