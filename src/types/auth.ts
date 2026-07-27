export interface AuthTenant {
  id: string;
  slug: string;
  code: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  primaryColor: string;
  locale: string;
  timezone: string;
  enabledModules: string[];
  roleCodes: string[];
  permissions: string[];
}

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  isPlatformAdmin: boolean;
  activeTenant: AuthTenant;
  tenants: AuthTenant[];
  roleCodes: string[];
  permissions: string[];
}

export interface AuthPayload {
  accessToken: string;
  expiresIn: string;
  user: AuthUser;
}
