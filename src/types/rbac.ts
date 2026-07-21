export interface Permission {
  id: string;
  key: string;
  name: string;
  group: string;
  description: string | null;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: Permission[];
}

