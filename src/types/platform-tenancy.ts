export interface PlatformTenant {
  id: string;
  code: string;
  slug: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  primaryColor: string;
  locale: string;
  timezone: string;
  enabledModules: string[];
  siteCount?: number;
  memberCount?: number;
}

export interface PlatformTenantInitialAdmin {
  username: string;
  password: string;
  displayName: string;
}

export interface CreatedPlatformTenant extends PlatformTenant {
  initialAdmin: PlatformTenantInitialAdmin;
}

export interface CreatePlatformTenantInput {
  code: string;
  slug: string;
  name: string;
  shortName: string;
  locale: string;
  timezone: string;
  primaryColor: string;
  enabledModules: string[];
}

export type UpdatePlatformTenantInput = Pick<
  CreatePlatformTenantInput,
  'name' | 'shortName' | 'locale' | 'timezone' | 'primaryColor' | 'enabledModules'
>;

export type PlatformTenantCollectionStatus =
  | 'idle'
  | 'loading'
  | 'succeeded'
  | 'failed';

export interface PlatformTenantsState {
  active: PlatformTenant[];
  archived: PlatformTenant[];
  activeStatus: PlatformTenantCollectionStatus;
  archivedStatus: PlatformTenantCollectionStatus;
  activeFetchedAt: number | null;
  archivedFetchedAt: number | null;
  activeError: string | null;
  archivedError: string | null;
}

export interface PlatformTenantsRootState {
  platformTenants: PlatformTenantsState;
}

export interface FetchPlatformTenantsInput {
  force?: boolean;
}

export interface UpdatePlatformTenantActionInput {
  id: string;
  input: UpdatePlatformTenantInput;
}

export interface PermanentlyDeletePlatformTenantInput {
  id: string;
  confirmation: string;
}

export interface ModuleChecklistProps {
  enabled: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

export interface CreateTenantDialogProps {
  onCreated: (initialAdmin: PlatformTenantInitialAdmin) => void;
}

export interface TenantConfigurationSectionProps {
  tenant: PlatformTenant;
  disabled?: boolean;
}

export interface TenantBrandingSettingsProps
  extends TenantConfigurationSectionProps {
  removeLogo: boolean;
  onRemoveLogoChange: (remove: boolean) => void;
}

export interface TenantModuleSettingsProps {
  enabledModules: string[];
  onChange: (modules: string[]) => void;
  disabled?: boolean;
}

export interface TenantDangerZoneProps {
  tenant: PlatformTenant;
  isArchiving: boolean;
  onArchive: () => Promise<void>;
}
