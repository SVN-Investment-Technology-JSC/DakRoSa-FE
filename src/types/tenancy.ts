export interface OrganizationUnit {
  id: string;
  code: string;
  name: string;
  type: string;
  parentId: string | null;
  isActive: boolean;
}

export interface Position {
  id: string;
  code: string;
  name: string;
  organizationUnitId: string | null;
  isActive: boolean;
}

export interface Organization {
  units: OrganizationUnit[];
  positions: Position[];
}

export interface TenantSettings {
  id: string;
  name: string;
  shortName: string;
  code: string;
  slug: string;
  primaryColor: string;
  locale: string;
  timezone: string;
}

export interface Site {
  id: string;
  code: string;
  name: string;
  address: string | null;
  isActive: boolean;
}

export interface TenancyBootstrap {
  tenant: TenantSettings;
  sites: Site[];
}

export interface CreateOrganizationUnitInput {
  code: string;
  name: string;
  type: string;
  parentId?: string;
}

export interface CreatePositionInput {
  code: string;
  name: string;
  organizationUnitId?: string;
}

export interface CreateSiteInput {
  code: string;
  name: string;
  address?: string;
}

export type UpdateTenantSettingsInput = Pick<
  TenantSettings,
  'name' | 'shortName' | 'primaryColor' | 'locale' | 'timezone'
>;

export type OrganizationRecordKind = 'units' | 'positions';
