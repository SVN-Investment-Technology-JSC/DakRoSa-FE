import re

with open('src/lib/navigation.ts', 'r') as f:
    content = f.read()

# Fix conflict 1 (PERMISSIONS)
part1 = content.split("<<<<<<< HEAD")[0]
part_rest = content.split("<<<<<<< HEAD")[1]
head1 = part_rest.split("=======")[0].strip()
part_rest2 = part_rest.split("=======")[1]
theirs1 = part_rest2.split(">>>>>>>")[0].strip()
part2 = part_rest2.split(">>>>>>>")[1].split("\n", 1)[1]

content = part1 + head1 + "\n  " + theirs1 + "\n" + part2

# Fix NavigationIcon
nav_icon_old = """export type NavigationIcon =
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
  | 'operations';"""
nav_icon_new = """export type NavigationIcon =
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
  | 'operations'
  | 'equipment'
  | 'inventory'
  | 'maintenance'
  | 'work_order';"""
content = content.replace(nav_icon_old, nav_icon_new)

# Fix conflict 2 (icon: NavigationIcon)
part1 = content.split("<<<<<<< HEAD")[0]
part_rest = content.split("<<<<<<< HEAD")[1]
head2 = part_rest.split("=======")[0].strip()
part_rest2 = part_rest.split("=======")[1]
theirs2 = part_rest2.split(">>>>>>>")[0].strip()
part2 = part_rest2.split(">>>>>>>")[1].split("\n", 1)[1]

content = part1 + head2 + "\n" + part2

# Fix conflict 3 (navigationConfig)
part1 = content.split("<<<<<<< HEAD")[0]
part_rest = content.split("<<<<<<< HEAD")[1]
head3 = part_rest.split("=======")[0].strip()
part_rest2 = part_rest.split("=======")[1]
theirs3 = part_rest2.split(">>>>>>>")[0].strip()
part2 = part_rest2.split(">>>>>>>")[1].split("\n", 1)[1]

new_nav = """    id: 'operations',
    label: 'Vận hành',
    description: 'Theo dõi và điều phối vận hành nhà máy',
    href: '/operations',
    icon: 'operations',
    viewPermission: PERMISSIONS.OPERATIONS_VIEW,
    actions: [
      { key: PERMISSIONS.EQUIPMENT_VIEW, label: 'Xem thiết bị' },
      { key: PERMISSIONS.EQUIPMENT_CREATE, label: 'Thêm thiết bị' },
      { key: PERMISSIONS.EQUIPMENT_UPDATE, label: 'Sửa thiết bị' },
      { key: PERMISSIONS.EQUIPMENT_DELETE, label: 'Xóa thiết bị' },
      { key: PERMISSIONS.INVENTORY_VIEW, label: 'Xem vật tư/kho' },
      { key: PERMISSIONS.INVENTORY_CREATE, label: 'Tạo vật tư/kho' },
      { key: PERMISSIONS.INVENTORY_TRANSACTION, label: 'Nhập xuất kho' },
      { key: PERMISSIONS.WORK_ORDER_VIEW, label: 'Xem phiếu công việc' },
      { key: PERMISSIONS.WORK_ORDER_CREATE, label: 'Tạo phiếu công việc' },
      { key: PERMISSIONS.WORK_ORDER_UPDATE, label: 'Cập nhật/Đóng phiếu' },
      { key: PERMISSIONS.MAINTENANCE_VIEW, label: 'Xem KH bảo trì' },
      { key: PERMISSIONS.MAINTENANCE_CREATE, label: 'Tạo KH bảo trì' },
      { key: PERMISSIONS.MAINTENANCE_UPDATE, label: 'Cập nhật KH bảo trì' },
      { key: PERMISSIONS.MAINTENANCE_DELETE, label: 'Xóa KH bảo trì' },
    ],
    children: [
      { id: 'equipment', label: 'Thiết bị & Tài sản', href: '/equipment' },
      { id: 'inventory', label: 'Kho vật tư', href: '/inventory' },
      { id: 'work-orders', label: 'Phiếu công việc', href: '/work-orders' },
      { id: 'maintenance', label: 'Bảo trì định kỳ', href: '/maintenance' },
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
  },"""

content = part1 + new_nav + "\n" + part2

with open('src/lib/navigation.ts', 'w') as f:
    f.write(content)
