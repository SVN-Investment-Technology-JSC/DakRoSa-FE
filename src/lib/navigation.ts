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
  WORK_ITEMS_VIEW: 'work-items.view',
  SUBMISSIONS_VIEW: 'submissions.view',
  SUBMISSIONS_CREATE: 'submissions.create',
  SUBMISSIONS_UPDATE: 'submissions.update',
  SUBMISSIONS_SUBMIT: 'submissions.submit',
  SUBMISSIONS_REVIEW: 'submissions.review',
  SIGNATURES_VIEW: 'signatures.view',
  SIGNATURES_REQUEST: 'signatures.request',
  TENANT_SETTINGS_VIEW: 'tenant-settings.view',
  TENANT_SETTINGS_UPDATE: 'tenant-settings.update',
  ORGANIZATION_VIEW: 'organization.view',
  ORGANIZATION_MANAGE: 'organization.manage',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface PermissionAction {
  key: PermissionKey;
  label: string;
}

export type NavigationIcon =
  | 'dashboard'
  | 'work-items'
  | 'submissions'
  | 'signatures'
  | 'users'
  | 'roles'
  | 'audit'
  | 'settings'
  | 'organization'
  | 'eoffice'
  | 'operations';

export type TenantModuleKey =
  | 'core'
  | 'administration'
  | 'e-office'
  | 'digital-signature'
  | 'organization'
  | 'hrm'
  | 'attendance'
  | 'workspace'
  | 'planning'
  | 'kpi'
  | 'project-management'
  | 'internal-administration';

export interface NavigationItem {
  id: string;
  group?: 'workspace' | 'office' | 'administration';
  label: string;
  description: string;
  href: string;
  icon: NavigationIcon;
  viewPermission: PermissionKey;
  actions: PermissionAction[];
  module?: TenantModuleKey;
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
    group: 'workspace',
    label: 'Tổng quan',
    description: 'Thông tin điều hành trong ngày',
    href: '/dashboard',
    icon: 'dashboard',
    viewPermission: PERMISSIONS.DASHBOARD_VIEW,
    actions: [],
  },
  {
    id: 'work-items',
    group: 'workspace',
    label: 'Việc cần xử lý',
    description: 'Hồ sơ đang chờ bạn phê duyệt',
    href: '/work-items',
    icon: 'work-items',
    viewPermission: PERMISSIONS.WORK_ITEMS_VIEW,
    actions: [],
  },
  {
    id: 'submissions',
    group: 'office',
    label: 'Hồ sơ trình ký',
    description: 'Soạn, gửi và theo dõi phê duyệt',
    href: '/e-office/submissions',
    icon: 'submissions',
    viewPermission: PERMISSIONS.SUBMISSIONS_VIEW,
    module: 'e-office',
    actions: [
      { key: PERMISSIONS.SUBMISSIONS_CREATE, label: 'Tạo mới' },
      { key: PERMISSIONS.SUBMISSIONS_UPDATE, label: 'Cập nhật' },
      { key: PERMISSIONS.SUBMISSIONS_SUBMIT, label: 'Gửi duyệt' },
      { key: PERMISSIONS.SUBMISSIONS_REVIEW, label: 'Phê duyệt' },
    ],
  },
  {
    id: 'signatures',
    group: 'office',
    label: 'Chữ ký số',
    description: 'Hàng đợi và trạng thái ký số',
    href: '/signatures',
    icon: 'signatures',
    viewPermission: PERMISSIONS.SIGNATURES_VIEW,
    module: 'digital-signature',
    actions: [
      { key: PERMISSIONS.SIGNATURES_REQUEST, label: 'Tạo yêu cầu' },
    ],
  },
  {
    id: 'tenant-settings',
    group: 'administration',
    label: 'Cấu hình doanh nghiệp',
    description: 'Nhận diện, ngôn ngữ và nhà máy trực thuộc',
    href: '/administration/settings',
    icon: 'settings',
    viewPermission: PERMISSIONS.TENANT_SETTINGS_VIEW,
    module: 'administration',
    actions: [
      { key: PERMISSIONS.TENANT_SETTINGS_UPDATE, label: 'Cập nhật cấu hình' },
    ],
  },
  {
    id: 'organization',
    group: 'administration',
    label: 'Cơ cấu tổ chức',
    description: 'Phòng ban, đơn vị và chức danh',
    href: '/administration/organization',
    icon: 'organization',
    viewPermission: PERMISSIONS.ORGANIZATION_VIEW,
    module: 'organization',
    actions: [
      { key: PERMISSIONS.ORGANIZATION_MANAGE, label: 'Quản lý cơ cấu' },
    ],
  },
  {
    id: 'users',
    group: 'administration',
    label: 'Người dùng doanh nghiệp',
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
    group: 'administration',
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
    group: 'administration',
    label: 'Nhật ký doanh nghiệp',
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

export function tenantPath(tenantSlug: string, href: string): string {
  return `/t/${tenantSlug}${href}`;
}
