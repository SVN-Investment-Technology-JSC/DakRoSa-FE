export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_RESET_PASSWORD: 'users.reset-password',
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',
  ROLES_ASSIGN_PERMISSIONS: 'roles.assign-permissions',
  AUDIT_VIEW: 'audit.view',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface PermissionAction {
  key: PermissionKey;
  label: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: 'dashboard' | 'users' | 'roles' | 'audit';
  viewPermission: PermissionKey;
  actions: PermissionAction[];
}

export const navigationConfig: readonly NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Tổng quan',
    description: 'Trung tâm tình trạng vận hành',
    href: '/dashboard',
    icon: 'dashboard',
    viewPermission: PERMISSIONS.DASHBOARD_VIEW,
    actions: [],
  },
  {
    id: 'users',
    label: 'Người dùng',
    description: 'Tài khoản và vai trò được gán',
    href: '/users',
    icon: 'users',
    viewPermission: PERMISSIONS.USERS_VIEW,
    actions: [
      { key: PERMISSIONS.USERS_CREATE, label: 'Tạo mới' },
      { key: PERMISSIONS.USERS_UPDATE, label: 'Cập nhật' },
      { key: PERMISSIONS.USERS_DELETE, label: 'Xóa' },
      { key: PERMISSIONS.USERS_RESET_PASSWORD, label: 'Đặt lại mật khẩu' },
    ],
  },
  {
    id: 'roles',
    label: 'Vai trò & quyền',
    description: 'Ma trận quyền theo vai trò động',
    href: '/roles',
    icon: 'roles',
    viewPermission: PERMISSIONS.ROLES_VIEW,
    actions: [
      { key: PERMISSIONS.ROLES_CREATE, label: 'Tạo vai trò' },
      { key: PERMISSIONS.ROLES_UPDATE, label: 'Cập nhật' },
      { key: PERMISSIONS.ROLES_DELETE, label: 'Xóa' },
      { key: PERMISSIONS.ROLES_ASSIGN_PERMISSIONS, label: 'Gán quyền' },
    ],
  },
  {
    id: 'audit',
    label: 'Nhật ký hệ thống',
    description: 'Dấu vết thao tác quản trị',
    href: '/audit',
    icon: 'audit',
    viewPermission: PERMISSIONS.AUDIT_VIEW,
    actions: [],
  },
] as const;
