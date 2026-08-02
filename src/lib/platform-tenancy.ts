export type TenantModuleGroupKey =
  | 'active'
  | 'planned'
  | 'eam-cmms';

export interface PlatformTenantModule {
  key: string;
  label: string;
  description: string;
}

export interface PlatformTenantModuleGroup {
  key: TenantModuleGroupKey;
  label: string;
  description: string;
  modules: readonly PlatformTenantModule[];
}

export const PLATFORM_TENANT_MODULE_GROUPS: readonly PlatformTenantModuleGroup[] = [
  {
    key: 'active',
    label: 'Đang sử dụng',
    description: 'Các nghiệp vụ đã có màn hình và API vận hành.',
    modules: [
      {
        key: 'administration',
        label: 'Quản trị doanh nghiệp',
        description: 'Cấu hình doanh nghiệp, người dùng, vai trò và nhật ký.',
      },
      {
        key: 'e-office',
        label: 'E-Office',
        description: 'Hồ sơ trình ký, gửi duyệt và xử lý công việc.',
      },
      {
        key: 'digital-signature',
        label: 'Chữ ký số',
        description: 'Tạo và theo dõi yêu cầu ký số.',
      },
      {
        key: 'organization',
        label: 'Cơ cấu tổ chức',
        description: 'Đơn vị, phòng ban và chức danh.',
      },
    ],
  },
  {
    key: 'planned',
    label: 'Đang phát triển',
    description: 'Bật để cho phép truy cập các màn hình xem trước của phân hệ.',
    modules: [
      { key: 'hrm', label: 'HRM', description: 'Hồ sơ và nghiệp vụ nhân sự.' },
      { key: 'attendance', label: 'Chấm công', description: 'Ca kíp, chấm công và bảng công.' },
      { key: 'workspace', label: 'Không gian làm việc', description: 'Giao việc và phối hợp.' },
      { key: 'planning', label: 'Kế hoạch', description: 'Kế hoạch cá nhân và đơn vị.' },
      { key: 'kpi', label: 'KPI', description: 'Chỉ tiêu và đánh giá theo kỳ.' },
      {
        key: 'project-management',
        label: 'Quản lý dự án',
        description: 'Dự án, tiến độ và hồ sơ nghiệm thu.',
      },
      {
        key: 'internal-administration',
        label: 'Hành chính nội bộ',
        description: 'Nghiệp vụ hành chính nội bộ.',
      },
    ],
  },
  {
    key: 'eam-cmms',
    label: 'EAM/CMMS',
    description: 'Quản lý kỹ thuật, thiết bị, vật tư và bảo trì.',
    modules: [
      {
        key: 'cmms',
        label: 'EAM / CMMS',
        description: 'Thiết bị, kho vật tư, phiếu công việc và bảo trì.',
      },
    ],
  },
];

export const PLATFORM_TENANT_MODULES = PLATFORM_TENANT_MODULE_GROUPS.flatMap(
  (group) => group.modules.map(({ key, label }) => [key, label] as const),
);

export const DEFAULT_PLATFORM_TENANT_MODULES = [
  'administration',
  'e-office',
  'digital-signature',
  'organization',
];
