export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  roleCodes: string[];
  permissions: string[];
}

export interface AuthPayload {
  accessToken: string;
  expiresIn: string;
  user: AuthUser;
}

