const DEMO_DATA_ENABLED = true;

const now = new Date('2026-07-27T08:30:00+07:00').toISOString();
const tomorrow = new Date('2026-07-28T16:00:00+07:00').toISOString();
const yesterday = new Date('2026-07-26T16:00:00+07:00').toISOString();

const demoUsers = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    username: 'nguyen.van.minh',
    displayName: 'Nguyễn Văn Minh',
    shortName: 'Minh',
    email: 'minh.nguyen@dakrosa.vn',
    phone: '0901 234 567',
    address: 'Đắk Nông',
    joinedAt: '2022-05-16',
    workShift: 'Hành chính',
    isActive: true,
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
    roles: [],
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    username: 'tran.thi.lan',
    displayName: 'Trần Thị Lan',
    shortName: 'Lan',
    email: 'lan.tran@dakrosa.vn',
    phone: '0902 345 678',
    address: 'Đắk Nông',
    joinedAt: '2023-02-10',
    workShift: 'Ca A',
    isActive: true,
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
    roles: [],
  },
];

const demoRoles = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    code: 'van-thu',
    name: 'Văn thư',
    description: 'Quản lý hồ sơ, văn bản và luồng trình ký.',
    isSystem: false,
    permissions: [],
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    code: 'lanh-dao',
    name: 'Lãnh đạo phê duyệt',
    description: 'Xem, phê duyệt và trả lại hồ sơ được phân công.',
    isSystem: false,
    permissions: [],
  },
  {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    code: 'nhan-su',
    name: 'Chuyên viên nhân sự',
    description: 'Quản lý dữ liệu nhân sự, ca kíp và bảng công.',
    isSystem: false,
    permissions: [],
  },
];

const demoReviewers = demoUsers.map(({ id, username, displayName }) => ({
  id,
  username,
  displayName,
}));

const demoSubmissions = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    code: 'HS-2026-0001',
    title: 'Tờ trình phê duyệt kế hoạch sản xuất tháng 08/2026',
    summary: 'Kế hoạch vận hành, sản lượng và nhu cầu nguồn lực tháng 08/2026.',
    documentType: 'Tờ trình',
    priority: 'high',
    status: 'in_review',
    workflowKey: 'standard-approval',
    workflowVersion: 1,
    currentStep: 'manager-review',
    requesterId: demoUsers[0].id,
    requester: demoReviewers[0],
    currentAssigneeId: demoUsers[1].id,
    currentAssignee: demoReviewers[1],
    dueAt: tomorrow,
    submittedAt: now,
    decidedAt: null,
    metadata: {},
    rowVersion: 1,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    code: 'HS-2026-0002',
    title: 'Đề nghị cấp phát vật tư dự phòng quý III',
    summary: 'Tổng hợp nhu cầu vật tư thiết bị và vật tư văn phòng.',
    documentType: 'Đề nghị',
    priority: 'urgent',
    status: 'in_review',
    workflowKey: 'standard-approval',
    workflowVersion: 1,
    currentStep: 'manager-review',
    requesterId: demoUsers[0].id,
    requester: demoReviewers[0],
    currentAssigneeId: demoUsers[1].id,
    currentAssignee: demoReviewers[1],
    dueAt: yesterday,
    submittedAt: yesterday,
    decidedAt: null,
    metadata: {},
    rowVersion: 1,
    createdAt: yesterday,
    updatedAt: yesterday,
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    code: 'HS-2026-0003',
    title: 'Kế hoạch đào tạo an toàn lao động năm 2026',
    summary: 'Kế hoạch đào tạo và chứng chỉ bắt buộc cho khối vận hành.',
    documentType: 'Kế hoạch',
    priority: 'normal',
    status: 'approved',
    workflowKey: 'standard-approval',
    workflowVersion: 1,
    currentStep: 'approved',
    requesterId: demoUsers[1].id,
    requester: demoReviewers[1],
    currentAssigneeId: null,
    currentAssignee: null,
    dueAt: null,
    submittedAt: now,
    decidedAt: now,
    metadata: {},
    rowVersion: 1,
    createdAt: now,
    updatedAt: now,
  },
];

const demoSubmissionDetail = {
  ...demoSubmissions[0],
  actions: [
    {
      id: '90000000-0000-4000-8000-000000000001',
      action: 'create',
      fromStatus: null,
      toStatus: 'draft',
      note: null,
      actor: demoReviewers[0],
      createdAt: yesterday,
    },
    {
      id: '90000000-0000-4000-8000-000000000002',
      action: 'submit',
      fromStatus: 'draft',
      toStatus: 'in_review',
      note: 'Kính trình lãnh đạo xem xét, phê duyệt.',
      actor: demoReviewers[0],
      createdAt: now,
    },
  ],
};

const demoSites = [
  { id: '30000000-0000-4000-8000-000000000001', code: 'DRS-01', name: 'Nhà máy Thủy điện Đắk Rơ Sa', address: 'Đắk Glong, Đắk Nông', isActive: true },
  { id: '30000000-0000-4000-8000-000000000002', code: 'DRS-02', name: 'Nhà máy Thủy điện Đắk Rơ Sa 2', address: 'Đắk Glong, Đắk Nông', isActive: true },
];

const demoOrganization = {
  units: [
    { id: '40000000-0000-4000-8000-000000000001', code: 'BGD', name: 'Ban Giám đốc', type: 'division', parentId: null, isActive: true },
    { id: '40000000-0000-4000-8000-000000000002', code: 'VHANH', name: 'Phòng Vận hành', type: 'department', parentId: null, isActive: true },
    { id: '40000000-0000-4000-8000-000000000003', code: 'KYTHUAT', name: 'Phòng Kỹ thuật', type: 'department', parentId: null, isActive: true },
    { id: '40000000-0000-4000-8000-000000000004', code: 'HCNS', name: 'Phòng Hành chính - Nhân sự', type: 'department', parentId: null, isActive: true },
  ],
  positions: [
    { id: '50000000-0000-4000-8000-000000000001', code: 'GD', name: 'Giám đốc', organizationUnitId: '40000000-0000-4000-8000-000000000001', isActive: true },
    { id: '50000000-0000-4000-8000-000000000002', code: 'TRUONG-PVH', name: 'Trưởng phòng Vận hành', organizationUnitId: '40000000-0000-4000-8000-000000000002', isActive: true },
    { id: '50000000-0000-4000-8000-000000000003', code: 'CHUYENVIEN-NS', name: 'Chuyên viên Nhân sự', organizationUnitId: '40000000-0000-4000-8000-000000000004', isActive: true },
  ],
};

function hasNoItems(data: unknown): boolean {
  if (Array.isArray(data)) return data.length === 0;
  if (data && typeof data === 'object' && 'items' in data) {
    const items = (data as { items?: unknown }).items;
    return Array.isArray(items) && items.length === 0;
  }
  return false;
}

function responseFor(path: string): unknown {
  const pathname = path.split('?')[0];
  if (pathname === '/dashboard/summary') return { users: 86, activeUsers: 79, roles: 7, eventsToday: 18, collector: { status: 'healthy', label: 'Hoạt động ổn định' } };
  if (pathname === '/e-office/summary') return { draft: 4, inReview: 7, returned: 2, approved: 18, cancelled: 1 };
  if (pathname === '/e-office/work-items') return { items: demoSubmissions.filter((item) => item.status === 'in_review'), total: 2 };
  if (pathname === '/e-office/submissions') return { items: demoSubmissions, total: demoSubmissions.length, page: 1, limit: 50 };
  if (/^\/e-office\/submissions\/[\w-]+$/.test(pathname)) return demoSubmissionDetail;
  if (pathname === '/e-office/reviewers') return demoReviewers;
  if (pathname === '/signatures') return [{ id: '60000000-0000-4000-8000-000000000001', submissionId: demoSubmissions[0].id, submission: demoSubmissions[0], requestedBy: demoUsers[0].id, requester: demoReviewers[0], provider: 'VNPT-CA', signingMode: 'USB Token', status: 'processing', externalReference: 'VNPT-DEMO-20260727', completedAt: null, failureReason: null, metadata: {}, createdAt: now, updatedAt: now }];
  if (pathname === '/users/assignable-roles') return demoRoles;
  if (pathname === '/users') return { items: demoUsers.map((user, index) => ({ ...user, roles: [demoRoles[index % demoRoles.length]] })), total: demoUsers.length, page: 1, limit: 50 };
  if (pathname === '/rbac/roles') return demoRoles;
  if (pathname === '/audit-logs') return { items: [
    { id: '70000000-0000-4000-8000-000000000001', userId: demoUsers[0].id, username: demoUsers[0].username, action: 'submit', resource: 'submission', resourceId: demoSubmissions[0].id, status: 'success', ipAddress: '10.10.10.25', details: { code: demoSubmissions[0].code }, createdAt: now },
    { id: '70000000-0000-4000-8000-000000000002', userId: demoUsers[1].id, username: demoUsers[1].username, action: 'update', resource: 'organization_unit', resourceId: demoOrganization.units[1].id, status: 'success', ipAddress: '10.10.10.18', details: { unit: demoOrganization.units[1].name }, createdAt: yesterday },
  ], total: 2 };
  if (pathname === '/tenancy/organization') return demoOrganization;
  if (pathname === '/tenancy/organization/tree') return { units: demoOrganization.units.map(u => ({ ...u, children: [], personnel: [] })) };
  if (pathname === '/tenancy/settings') return { tenant: { id: '80000000-0000-4000-8000-000000000001', name: 'Công ty Cổ phần Thủy điện Đắk Rơ Sa', shortName: 'EVN HPC Đắk Rơ Sa', code: 'DAKROSA', slug: 'dakrosa', primaryColor: '#386948', locale: 'vi-VN', timezone: 'Asia/Ho_Chi_Minh' }, sites: demoSites };
  if (pathname === '/platform/tenants') return [{ id: '80000000-0000-4000-8000-000000000001', code: 'DAKROSA', slug: 'dakrosa', name: 'Công ty Cổ phần Thủy điện Đắk Rơ Sa', shortName: 'EVN HPC Đắk Rơ Sa', primaryColor: '#386948', locale: 'vi-VN', timezone: 'Asia/Ho_Chi_Minh', enabledModules: ['core', 'administration', 'e-office', 'digital-signature', 'organization', 'hrm', 'planning', 'kpi', 'project-management'], siteCount: 2, memberCount: 86 }, { id: '80000000-0000-4000-8000-000000000002', code: 'DEMO-01', slug: 'demo-thuy-dien', name: 'Nhà máy Thủy điện Demo', shortName: 'Thủy điện Demo', primaryColor: '#2F6B91', locale: 'vi-VN', timezone: 'Asia/Ho_Chi_Minh', enabledModules: ['core', 'administration', 'e-office', 'organization', 'hrm', 'planning', 'kpi', 'project-management'], siteCount: 1, memberCount: 42 }];
  return undefined;
}

export function withDemoData(path: string, data: unknown): unknown {
  if (!DEMO_DATA_ENABLED) return data;
  const demo = responseFor(path);
  if (demo === undefined) return data;
  if (hasNoItems(data)) return demo;
  if (path.split('?')[0] === '/dashboard/summary' && (data as { users?: number }).users === 0) return demo;
  if (path.split('?')[0] === '/e-office/summary') {
    const summary = data as { draft?: number; inReview?: number; returned?: number; approved?: number };
    if (!summary.draft && !summary.inReview && !summary.returned && !summary.approved) return demo;
  }
  if (path.split('?')[0] === '/tenancy/organization') {
    const organization = data as { units?: unknown[]; positions?: unknown[] };
    if (!organization.units?.length && !organization.positions?.length) return demo;
  }
  if (path.split('?')[0] === '/tenancy/settings') {
    const settings = data as { sites?: unknown[] };
    if (!settings.sites?.length) return { ...(data as object), ...(demo as object), tenant: (data as { tenant: unknown }).tenant };
  }
  return data;
}

export function demoDataForMissingGet(path: string): unknown {
  return DEMO_DATA_ENABLED ? responseFor(path) : undefined;
}
