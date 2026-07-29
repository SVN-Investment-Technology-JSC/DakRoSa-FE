import type {
  CreatePlatformTenantInput,
  CreatedPlatformTenant,
  PlatformTenant,
  UpdatePlatformTenantInput,
} from '@/types/platform-tenancy';
import { apiRequest } from './api-client';

export const platformTenantsService = {
  getActive: () => apiRequest<PlatformTenant[]>('/platform/tenants'),
  getArchived: () => apiRequest<PlatformTenant[]>('/platform/tenants/archived'),
  create: (input: CreatePlatformTenantInput) => apiRequest<CreatedPlatformTenant>('/platform/tenants', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, input: UpdatePlatformTenantInput) => apiRequest<PlatformTenant>(`/platform/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  uploadLogo(id: string, file: File) {
    const data = new FormData();
    data.append('logo', file);
    return apiRequest<PlatformTenant>(`/platform/tenants/${id}/logo`, { method: 'POST', body: data });
  },
  removeLogo: (id: string) => apiRequest<PlatformTenant>(`/platform/tenants/${id}/logo`, { method: 'DELETE' }),
  archive: (id: string) => apiRequest<void>(`/platform/tenants/${id}`, { method: 'DELETE' }),
  restore: (id: string) => apiRequest<PlatformTenant>(`/platform/tenants/${id}/restore`, { method: 'POST' }),
  permanentlyDelete: (id: string, confirmation: string) => apiRequest<void>(`/platform/tenants/${id}/permanent`, { method: 'DELETE', body: JSON.stringify({ confirmation }) }),
};
