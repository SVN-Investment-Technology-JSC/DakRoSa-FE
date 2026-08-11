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

export interface OrganizationChartPerson { id: string; employeeCode: string; fullName: string; positionName: string; isPrimary: boolean; rank: number; username: string | null; email: string | null; organizationTags: string[]; additionalPositionTags: string[]; primaryAssignment: { positionName: string; rank: number } | null; }
export interface OrganizationChartUnit extends OrganizationUnit { personnel: OrganizationChartPerson[]; children: OrganizationChartUnit[]; }
export interface OrganizationChart { units: OrganizationChartUnit[]; positions: Position[]; }

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

export interface CreatePersonnelInput { employeeCode: string; fullName: string; phone?: string; email?: string; status?: string; userId?: string; }
export interface CreatePersonnelAssignmentInput { organizationUnitId: string; positionId: string; isPrimary?: boolean; rank?: number; startDate?: string; }
export interface CreateAndAssignPersonnelInput { employeeCode: string; fullName: string; phone?: string; email?: string; organizationUnitId: string; positionId: string; rank?: number; startDate?: string; createAccount?: boolean; username?: string; password?: string; roleId?: string; }

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
