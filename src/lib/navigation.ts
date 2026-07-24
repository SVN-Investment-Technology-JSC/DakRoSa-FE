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
  EOFFICE_VIEW: 'eoffice.view',
  OPERATIONS_VIEW: 'operations.view',
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
  icon: 'dashboard' | 'users' | 'roles' | 'audit' | 'eoffice' | 'operations';
  viewPermission: PermissionKey;
  actions: PermissionAction[];
  children?: readonly NavigationChild[];
}

export interface NavigationChild {
  id: string;
  label: string;
  href: string;
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
  {
    id: 'operations',
    label: 'Vận hành',
    description: 'Theo dõi và điều phối vận hành nhà máy',
    href: '/operations',
    icon: 'operations',
    viewPermission: PERMISSIONS.OPERATIONS_VIEW,
    actions: [],
    children: [
      { id: 'eam-cmms', label: 'EAM / CMMS', href: '/eam-cmms' },
      { id: 'equipments', label: 'Thiết bị', href: '/equipments' },
      { id: 'maintenance', label: 'Bảo trì & công việc', href: '/maintenance' },
      { id: 'inventory', label: 'Kho vật tư', href: '/inventory' },
      { id: 'occ', label: 'Liên kết OCC', href: '/occ' },
    ],
  },
  {
    id: 'eoffice',
    label: 'eOffice',
    description: 'Quản lý công việc và hồ sơ điện tử',
    href: '/eoffice',
    icon: 'eoffice',
    viewPermission: PERMISSIONS.EOFFICE_VIEW,
    actions: [],
    children: [
      { id: 'eoffice-workflow', label: 'Văn bản & quy trình', href: '/eoffice-workflow' },
      { id: 'hrm', label: 'Nhân sự & chấm công', href: '/hrm' },
      { id: 'workspace', label: 'Không gian công việc', href: '/workspace' },
      { id: 'kpi', label: 'KPI', href: '/kpi' },
      { id: 'projects', label: 'Dự án', href: '/projects' },
    ],
  },
] as const;
