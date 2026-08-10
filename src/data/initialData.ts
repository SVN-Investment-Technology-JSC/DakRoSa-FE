import {
  DepartmentGroup,
  MatrixRow,
  WorkflowGroup,
  NodeTypeConfig,
  OrgNode,
  MaintenancePartItem,
  WorkspaceTask,
  AlertTicket,
  CanvasNodeData,
  WorkflowRequest
} from '../types';

export const INITIAL_DEPARTMENTS: DepartmentGroup[] = [
  {
    id: 'dept-eng',
    name: 'Engineering Dept',
    isCollapsed: false,
    roles: [
      { id: 'vp-eng', title: 'VP Eng' },
      { id: 'lead-dev', title: 'Lead Dev' },
      { id: 'staff-dev', title: 'Staff Dev', isWarningContext: true },
    ],
  },
  {
    id: 'dept-prod',
    name: 'Product',
    isCollapsed: true,
    roles: [
      { id: 'prod-head', title: 'Product Head' },
      { id: 'pm', title: 'PM' },
    ],
  },
  {
    id: 'dept-comp',
    name: 'Compliance',
    isCollapsed: false,
    roles: [
      { id: 'officer', title: 'Officer' },
      { id: 'auditor', title: 'Auditor' },
    ],
  },
];

// --- Bảng 1: Tạo quy trình (Không có Executor 'E') ---
export const INITIAL_PROCESS_WORKFLOWS: WorkflowGroup[] = [
  {
    id: 'pwf-1',
    code: 'WF-CAPEX',
    workflowName: 'Quy trình Phê duyệt CapEx',
    description: 'Quy trình thẩm định và cấp phát vốn đầu tư tài sản cố định.',
    isExpanded: true,
    steps: [
      {
        id: 'ps-1',
        icon: 'description',
        stepName: '1-Khởi tạo Yêu cầu CapEx',
        assignments: {
          'lead-dev': 'S',
          'vp-eng': 'I',
          'prod-head': 'I',
          'pm': 'S',
          'officer': '',
          'auditor': '',
        },
      },
      {
        id: 'ps-2',
        icon: 'fact_check',
        stepName: '2-Thẩm định Kỹ thuật & Dự toán',
        assignments: {
          'lead-dev': 'R',
          'vp-eng': 'C[1]',
          'staff-dev': 'R',
          'officer': 'I',
          'auditor': '',
        },
      },
      {
        id: 'ps-3',
        icon: 'verified',
        stepName: '3-Kiểm tra Tuân thủ & Khung Pháp lý',
        assignments: {
          'officer': 'C[2]',
          'auditor': 'R',
          'vp-eng': 'I',
        },
      },
      {
        id: 'ps-4',
        icon: 'campaign',
        stepName: '4-Báo cáo & Thông báo Ban Giám đốc',
        assignments: {
          'vp-eng': 'I',
          'prod-head': 'I',
          'auditor': 'I',
        },
        linkedSubFlowId: 'mwf-1',
        linkedSubFlowName: 'Luồng Bảo trì Định kỳ Thiết bị CapEx Máy chủ',
      },
    ],
  },
  {
    id: 'pwf-2',
    code: 'WF-CONTRACT',
    workflowName: 'Quy trình Đánh giá & Phê duyệt Hợp đồng',
    description: 'Thẩm định điều khoản kỹ thuật, tài chính và tuân thủ pháp lý.',
    isExpanded: false,
    steps: [
      {
        id: 'ps-5',
        icon: 'edit_document',
        stepName: '1-Soạn thảo Mẫu Hợp đồng',
        assignments: {
          'pm': 'S',
          'lead-dev': 'I',
          'officer': 'I',
        },
      },
      {
        id: 'ps-6',
        icon: 'security',
        stepName: '2-Rà soát An toàn & Kỹ thuật',
        assignments: {
          'vp-eng': 'R',
          'lead-dev': 'R',
          'officer': 'C',
        },
      },
      {
        id: 'ps-7',
        icon: 'gavel',
        stepName: '3-Phê duyệt Pháp chế & Tài chính',
        assignments: {
          'officer': 'C',
          'auditor': 'R',
        },
      },
    ],
  },
];

// --- Bảng 2: Luồng thực thi bảo trì (Có Executor 'E') ---
export const INITIAL_MAINTENANCE_WORKFLOWS: WorkflowGroup[] = [
  {
    id: 'mwf-1',
    code: 'WF-MAINT-ROUTINE',
    workflowName: 'Luồng Bảo trì Định kỳ Thiết bị CapEx',
    description: 'Tự động kích hoạt khi Quy trình CapEx hoàn tất phê duyệt (Luồng liên kết, Không có vai trò S).',
    isExpanded: true,
    flowType: 'linked',
    steps: [
      {
        id: 'ms-1',
        icon: 'warning',
        stepName: '1-Khởi tạo Tự động từ CapEx Phê duyệt',
        assignments: {
          'staff-dev': 'I',
          'lead-dev': 'I',
        },
      },
      {
        id: 'ms-2',
        icon: 'build',
        stepName: '2-Kiểm tra Thực địa & Lập Phương án',
        assignments: {
          'lead-dev': 'R',
          'staff-dev': 'R',
          'vp-eng': 'I',
        },
      },
      {
        id: 'ms-3',
        icon: 'fact_check',
        stepName: '3-Phê duyệt Lệnh Làm việc & Cấp Vật tư',
        assignments: {
          'vp-eng': 'C[2]',
          'officer': 'I',
        },
        linkedSubFlowId: 'mwf-2',
        linkedSubFlowName: 'Luồng Sửa chữa PCCC Cứu hộ Khẩn cấp',
      },
      {
        id: 'ms-4',
        icon: 'engineering',
        stepName: '4-Triển khai Thực thi Bảo trì',
        assignments: {
          'staff-dev': 'E',
          'lead-dev': 'R',
        },
      },
      {
        id: 'ms-5',
        icon: 'task_alt',
        stepName: '5-Nghiệm thu & Lưu Hồ sơ',
        assignments: {
          'officer': 'I',
          'auditor': 'C[4]',
          'vp-eng': 'I',
        },
      },
    ],
  },
  {
    id: 'mwf-2',
    code: 'WF-MAINT-EMERGENCY',
    workflowName: 'Luồng Xử lý Bù áp & Cứu hộ Sự cố Khẩn cấp',
    description: 'Kế hoạch phản ứng nhanh khi có trục trặc hệ thống khẩn cấp (Luồng trực tiếp, Có vai trò S).',
    isExpanded: true,
    flowType: 'direct',
    steps: [
      {
        id: 'ms-6',
        icon: 'emergency',
        stepName: '1-Báo cáo Cứu hộ Khẩn cấp',
        assignments: {
          'staff-dev': 'S',
          'officer': 'I',
        },
      },
      {
        id: 'ms-7',
        icon: 'construction',
        stepName: '2-Thực thi Sửa chữa Trực tiếp',
        assignments: {
          'staff-dev': 'E',
          'lead-dev': 'E',
          'vp-eng': 'R',
        },
      },
      {
        id: 'ms-8',
        icon: 'health_and_safety',
        stepName: '3-Kiểm định An toàn Khôi phục',
        assignments: {
          'officer': 'C',
          'auditor': 'R',
        },
      },
    ],
  },
];

export const INITIAL_MATRIX_ROWS: MatrixRow[] = [
  {
    id: 'row-1',
    icon: 'description',
    stepName: '1. Requirement Gathering',
    assignments: {
      'vp-eng': 'I',
      'lead-dev': 'R',
      'staff-dev': '',
      'officer': '',
      'auditor': '',
    },
  },
  {
    id: 'row-2',
    icon: 'error',
    stepName: '2. Technical Design',
    hasError: true,
    assignments: {
      'vp-eng': 'C',
      'lead-dev': 'S',
      'staff-dev': '',
      'officer': 'C',
      'auditor': '',
    },
  },
  {
    id: 'row-3',
    icon: 'code',
    stepName: '3. Implementation',
    hasWarning: true,
    assignments: {
      'vp-eng': 'I',
      'lead-dev': '',
      'staff-dev': 'E',
      'officer': '',
      'auditor': '',
    },
  },
  {
    id: 'row-4',
    icon: 'fact_check',
    stepName: '4. Code Review',
    assignments: {
      'vp-eng': 'C',
      'lead-dev': 'R',
      'staff-dev': 'S',
      'officer': 'I',
      'auditor': '',
    },
  },
  {
    id: 'row-5',
    icon: 'warning',
    stepName: '5. Deployment',
    assignments: {
      'vp-eng': 'I',
      'lead-dev': 'E',
      'staff-dev': '',
      'officer': '',
      'auditor': '',
    },
  },
];

export const INITIAL_NODE_TYPES: NodeTypeConfig[] = [
  { id: 'khoi', name: 'Khối', colorClass: 'bg-primary', hexColor: '#006194' },
  { id: 'chi-nhanh', name: 'Chi nhánh', colorClass: 'bg-secondary', hexColor: '#545f73' },
  { id: 'phong', name: 'Phòng', colorClass: 'bg-tertiary', hexColor: '#894d00' },
  { id: 'ban', name: 'Ban', colorClass: 'bg-error', hexColor: '#ba1a1a' },
  { id: 'to', name: 'Tổ', colorClass: 'bg-primary-container', hexColor: '#007bb9' },
  { id: 'doi', name: 'Đội', colorClass: 'bg-secondary-container', hexColor: '#d5e0f8' },
];

export const INITIAL_ORG_TREE: OrgNode = {
  id: 'node-1',
  typeId: 'khoi',
  typeName: 'Khối',
  typeColor: '#006194',
  title: 'Khối Kỹ thuật',
  head: {
    id: 'p-1',
    name: 'Nguyen Van Tuan',
    title: 'Giám đốc Khối',
    avatarInitials: 'NT',
    avatarBg: 'bg-secondary-container text-on-secondary-container',
    isHead: true,
  },
  children: [
    {
      id: 'node-2',
      typeId: 'phong',
      typeName: 'Phòng',
      typeColor: '#894d00',
      title: 'Phòng Kỹ thuật',
      head: {
        id: 'p-2',
        name: 'Le Thi Mai',
        title: 'Trưởng phòng',
        avatarInitials: 'LM',
        avatarBg: 'bg-surface-variant text-on-surface-variant',
        isHead: true,
      },
      children: [
        {
          id: 'node-3',
          typeId: 'to',
          typeName: 'Tổ',
          typeColor: '#007bb9',
          title: 'Tổ Kỹ thuật 1',
          isActive: true, // highlighted node ring
          head: undefined, // "No Head Assigned"
        },
        {
          id: 'node-4',
          typeId: 'to',
          typeName: 'Tổ',
          typeColor: '#007bb9',
          title: 'Tổ Kỹ thuật 2',
          head: {
            id: 'p-3',
            name: 'Tran Hoang',
            title: 'Tổ trưởng',
            avatarInitials: 'TH',
            avatarBg: 'bg-tertiary-fixed-dim text-on-tertiary-fixed-variant',
            isHead: true,
          },
        },
      ],
    },
  ],
};

export const INITIAL_MAINTENANCE_PARTS: MaintenancePartItem[] = [
  { id: 'part-1', name: 'CNC Spindle Assembly', selectedFrequency: 'month' },
  { id: 'part-2', name: 'Hydraulic Pump Filter', selectedFrequency: 'week' },
  { id: 'part-3', name: 'Conveyor Belt Motor', selectedFrequency: 'quarter' },
  { id: 'part-4', name: 'Thermal Sensors Main', selectedFrequency: 'year' },
];

export const INITIAL_WORKSPACE_TASKS: WorkspaceTask[] = [
  {
    id: 'task-1',
    title: 'Phê duyệt CapEx mua sắm Máy chủ AI Cluster Q3',
    referenceCode: '[WF-CAPEX-2026]',
    referenceTitle: 'CapEx Equipment Upgrade',
    workflowId: 'pwf-1',
    workflowType: 'process',
    status: 'Active',
    dueDate: '2026-08-15',
    initiator: 'Trần Văn Hoàng (Lead Dev / Engineering)',
    department: 'Engineering Dept',
    priority: 'High',
    taskId: 'TSK-CAPEX-8842',
    description:
      'Quy trình thẩm định & cấp phát vốn đầu tư tài sản cố định mua cụm máy chủ huấn luyện mô hình AI. Cần thẩm định kỹ thuật phần cứng và phương án tản nhiệt trước khi chuyển Phòng Tuân thủ kiểm tra.',
    originalFiles: [
      { name: 'CapEx_Proposal_AI_Cluster.xlsx', size: '2.4 MB', type: 'excel' },
      { name: 'Technical_Spec_NVIDIA_H100.pdf', size: '1.8 MB', type: 'pdf' },
    ],
    subTasks: [
      { id: 'st-1', code: 'E(1)', assignee: 'Lê Văn Nam (Staff Dev)', details: 'Kiểm tra công suất điện & tản nhiệt phòng server', weight: 40, status: 'DONE' },
      { id: 'st-2', code: 'E(2)', assignee: 'Nguyễn Thanh Tùng (Senior Dev)', details: 'Lập dự toán chi phí vận hành & bảo trì năm 1', weight: 35, status: 'ACTIVE' },
      { id: 'st-3', code: 'E(3)', assignee: 'Phạm Minh Đức (DevOps)', details: 'Tổng hợp báo cáo kỹ thuật trình VP Eng', weight: 25, status: 'PENDING' },
    ],
    checkerRole: 'Thẩm định Kỹ thuật (R) & Tuân thủ (C)',
    subordinates: [
      { id: 'sub-1', name: 'Lê Văn Nam', role: 'Staff Dev (Thực thi)' },
      { id: 'sub-2', name: 'Nguyễn Thanh Tùng', role: 'Senior Dev (Thực thi)' },
      { id: 'sub-3', name: 'Phạm Minh Đức', role: 'DevOps (Thực thi)' },
    ],
    canvasNodes: [
      { id: 'cn-1', stepName: '1-Khởi tạo Yêu cầu CapEx', roleAssigned: 'Submitter (S): PM & Lead Dev', status: 'Completed', progress: 100 },
      { id: 'cn-2', stepName: '2-Thẩm định Kỹ thuật & Dự toán', roleAssigned: 'Reviewer (R): Lead Dev & Staff Dev', status: 'In Progress', progress: 65 },
      { id: 'cn-3', stepName: '3-Kiểm tra Tuân thủ & Khung Pháp lý', roleAssigned: 'Checker (C): Compliance Officer & Auditor', status: 'Pending', progress: 0 },
      { id: 'cn-4', stepName: '4-Báo cáo Ban Giám đốc', roleAssigned: 'Informed (I): VP Eng & Product Head', status: 'Pending', progress: 0, linkedSubFlowId: 'mwf-1', linkedSubFlowTitle: 'Luồng Bảo trì Định kỳ Thiết bị CapEx Máy chủ' },
    ],
    derivativeFlowId: 'mwf-1',
    derivativeFlowTitle: 'Luồng Bảo trì Định kỳ Thiết bị CapEx Máy chủ',
    derivativeCanvasNodes: [
      { id: 'dcn-1', stepName: '1-Khởi tạo Tự động từ CapEx', roleAssigned: 'System Triggered (No S)', status: 'Pending', isDerivative: true },
      { id: 'dcn-2', stepName: '2-Kiểm tra Định kỳ & Lập Phương án', roleAssigned: 'Reviewer (R): Lead Dev', status: 'Pending', isDerivative: true },
      { id: 'dcn-3', stepName: '3-Triển khai Bảo trì', roleAssigned: 'Executor (E): Staff Dev', status: 'Pending', isDerivative: true },
    ],
  },
  {
    id: 'task-2',
    title: 'Xử lý Bù áp & Cứu hộ Khẩn cấp Máy CNC-02',
    referenceCode: '[WF-MAINT-EMERGENCY-003]',
    referenceTitle: 'Emergency System Response',
    workflowId: 'mwf-2',
    workflowType: 'maintenance_direct',
    status: 'Active',
    dueDate: '2026-08-06',
    initiator: 'Phạm Văn Thành (Staff Dev)',
    department: 'Engineering Dept',
    priority: 'High',
    taskId: 'TSK-EMG-9901',
    description:
      'Luồng tác nghiệp sự cố trực tiếp khởi tạo khẩn cấp khi cảm biến áp suất dầu báo tụt áp đột ngột tại dây chuyền sản xuất số 2. Cần kỹ sư thực địa thay van xả áp và kiểm tra đường ống gấp.',
    originalFiles: [
      { name: 'Telemetry_Log_Sensor_CNC02.pdf', size: '420 KB', type: 'pdf' },
    ],
    subTasks: [
      { id: 'st-21', code: 'E(1)', assignee: 'Phạm Văn Thành (Staff Dev)', details: 'Thay van xả áp 2-chiều và niêm phong mối hàn', weight: 60, status: 'ACTIVE' },
      { id: 'st-22', code: 'E(2)', assignee: 'Trần Văn Hoàng (Lead Dev)', details: 'Chạy thử tải áp lực 150 bar và nghiệm thu an toàn', weight: 40, status: 'PENDING' },
    ],
    checkerRole: 'Checker (C): Compliance Officer',
    subordinates: [
      { id: 'sub-21', name: 'Phạm Văn Thành', role: 'Kỹ sư Bảo trì (Executor E)' },
    ],
    canvasNodes: [
      { id: 'cn-21', stepName: '1-Báo cáo Cứu hộ Khẩn cấp', roleAssigned: 'Submitter (S): Staff Dev', status: 'Completed', progress: 100 },
      { id: 'cn-22', stepName: '2-Thực thi Sửa chữa Trực tiếp', roleAssigned: 'Executor (E): Staff Dev & Lead Dev', status: 'In Progress', progress: 50 },
      { id: 'cn-23', stepName: '3-Kiểm định An toàn Khôi phục', roleAssigned: 'Checker (C): Compliance Officer & Auditor', status: 'Pending', progress: 0 },
    ],
  },
  {
    id: 'task-3',
    title: 'Đánh giá & Phê duyệt Hợp đồng Bảo trì Hệ thống PCCC',
    referenceCode: '[WF-CONTRACT-082]',
    referenceTitle: 'Contract Review Workflow',
    workflowId: 'pwf-2',
    workflowType: 'process',
    status: 'Completed',
    dueDate: '2026-08-01',
    initiator: 'Nguyễn Thị Thu (Product PM)',
    department: 'Product',
    priority: 'Normal',
    taskId: 'TSK-CTR-1029',
    description:
      'Quy trình thẩm định điều khoản hợp đồng thuê ngoài bảo trì định kỳ hệ thống phòng cháy chữa cháy 2026. Đã hoàn thành phê duyệt pháp chế & chuyển sang luồng bảo trì thực thi.',
    originalFiles: [
      { name: 'Draft_PCCC_Contract_2026.pdf', size: '3.1 MB', type: 'pdf' },
    ],
    subTasks: [
      { id: 'st-31', code: 'E(1)', assignee: 'Trần Pháp Lý (Legal Officer)', details: 'Rà soát điều khoản phạt vi phạm tiến độ', weight: 100, status: 'DONE' },
    ],
    checkerRole: 'Phê duyệt (C): Auditor & Legal Officer',
    subordinates: [],
    canvasNodes: [
      { id: 'cn-31', stepName: '1-Soạn thảo Mẫu Hợp đồng', roleAssigned: 'Submitter (S): PM', status: 'Completed', progress: 100 },
      { id: 'cn-32', stepName: '2-Rà soát An toàn & Kỹ thuật', roleAssigned: 'Reviewer (R): VP Eng & Lead Dev', status: 'Completed', progress: 100 },
      { id: 'cn-33', stepName: '3-Phê duyệt Pháp chế & Tài chính', roleAssigned: 'Checker (C): Officer & Auditor', status: 'Completed', progress: 100 },
    ],
    derivativeFlowId: 'mwf-1',
    derivativeFlowTitle: 'Luồng Bảo trì Định kỳ PCCC Hàng Quý',
    derivativeCanvasNodes: [
      { id: 'dcn-31', stepName: '1-Tự động tạo Lịch Bảo trì PCCC', roleAssigned: 'System Automated (Linked)', status: 'Completed', isDerivative: true },
      { id: 'dcn-32', stepName: '2-Kiểm tra & Test Đầu phun', roleAssigned: 'Executor (E): Staff Dev', status: 'In Progress', progress: 40, isDerivative: true },
      { id: 'dcn-33', stepName: '3-Nghiệm thu Hồ sơ', roleAssigned: 'Informed (I): Auditor', status: 'Pending', isDerivative: true },
    ],
  },
  {
    id: 'task-4',
    title: 'Bảo trì Định kỳ Trạm Biến áp 110kV (Tự động trigger từ CapEx)',
    referenceCode: '[WF-MAINT-ROUTINE-104]',
    referenceTitle: 'Routine Maintenance Derivative Flow',
    workflowId: 'mwf-1',
    workflowType: 'maintenance_linked',
    status: 'Active',
    dueDate: '2026-08-20',
    initiator: 'Hệ thống (Auto-triggered by CapEx Approval #WF-CAPEX-2025)',
    department: 'Engineering Dept',
    priority: 'Normal',
    taskId: 'TSK-MNT-7721',
    description:
      'Luồng bảo trì liên kết tự động khởi tạo khi Đơn CapEx mua sắm Trạm Biến áp 110kV hoàn tất phê duyệt. Không cần vai trò S thủ công. Luồng phân công trực tiếp cho nhóm Thực thi (E).',
    originalFiles: [
      { name: 'Maintenance_Schedule_110kV.xlsx', size: '1.2 MB', type: 'excel' },
    ],
    subTasks: [
      { id: 'st-41', code: 'E(1)', assignee: 'Hoàng Quốc Việt (Staff Dev)', details: 'Kiểm tra độ cách điện sứ xỏ & thử nghiệm máy cắt', weight: 50, status: 'DONE' },
      { id: 'st-42', code: 'E(2)', assignee: 'Lê Văn Nam (Staff Dev)', details: 'Bơm bổ sung dầu nhớt cách điện cuộn dây', weight: 50, status: 'ACTIVE' },
    ],
    checkerRole: 'Nghiệm thu (I): Compliance Auditor & VP Eng',
    subordinates: [
      { id: 'sub-41', name: 'Hoàng Quốc Việt', role: 'Technician (E)' },
      { id: 'sub-42', name: 'Lê Văn Nam', role: 'Technician (E)' },
    ],
    canvasNodes: [
      { id: 'cn-41', stepName: '1-Khởi tạo Tự động từ CapEx', roleAssigned: 'System Triggered (No S)', status: 'Completed', progress: 100 },
      { id: 'cn-42', stepName: '2-Kiểm tra Thực địa & Lập Phương án', roleAssigned: 'Reviewer (R): Lead Dev', status: 'Completed', progress: 100 },
      { id: 'cn-43', stepName: '3-Phê duyệt Lệnh Làm việc & Cấp Vật tư', roleAssigned: 'Checker (C): VP Eng', status: 'Completed', progress: 100, linkedSubFlowId: 'mwf-2', linkedSubFlowTitle: 'Luồng Sửa chữa PCCC Cứu hộ Khẩn cấp' },
      { id: 'cn-44', stepName: '4-Triển khai Thực thi Bảo trì', roleAssigned: 'Executor (E): Staff Dev', status: 'In Progress', progress: 50 },
      { id: 'cn-45', stepName: '5-Nghiệm thu & Lưu Hồ sơ', roleAssigned: 'Informed (I): Officer & Auditor', status: 'Pending', progress: 0 },
    ],
  },
];

export const INITIAL_WORKSPACE_TASK: WorkspaceTask = INITIAL_WORKSPACE_TASKS[0];

export const INITIAL_ALERT_TICKETS: AlertTicket[] = [
  {
    id: 'ticket-1',
    ticketNumber: '#4092',
    systemComponent: 'HVAC Unit B-East',
    details: 'Filter replacement required. Flow restricted.',
    deadlineText: 'Today',
    deadlineType: 'today',
    status: 'CRITICAL',
    priority: 'High',
  },
  {
    id: 'ticket-2',
    ticketNumber: '#4093',
    systemComponent: 'Main Conveyor Belt 2',
    details: 'Routine lubrication and tension check.',
    deadlineText: 'In 2 days',
    deadlineType: '2days',
    status: 'WARNING',
    priority: 'Medium',
  },
  {
    id: 'ticket-3',
    ticketNumber: '#4095',
    systemComponent: 'Server Rack Alpha - UPS',
    details: 'Battery health check approaching 3-year threshold.',
    deadlineText: 'In 3 days',
    deadlineType: '3days',
    status: 'ROUTINE',
    priority: 'Low',
  },
];

export const INITIAL_CANVAS_NODES: CanvasNodeData[] = [
  { id: 'req-101', code: 'REQ-101', title: 'Intake Triage', status: 'Complete', type: 'standard', group: 'main' },
  { id: 'val-202', code: 'VAL-202', title: 'Automated Validation', status: 'Processing', progress: 65, type: 'execution', group: 'main' },
  { id: 'apr-303', code: 'APR-303', title: 'Final Approval', status: 'Pending', type: 'standard', group: 'main' },
  { id: 'mnt-001', code: 'MNT-001', title: 'Config Update', status: 'Queued', type: 'maintenance', group: 'maintenance' },
];

export const INITIAL_SUBMITTED_REQUESTS: WorkflowRequest[] = [
  {
    id: 'req-1',
    workflowType: 'IT Resource Provisioning',
    title: 'Q3 Server Upgrade Allocation',
    description: 'Hardware upgrade for cloud compute node cluster.',
    priority: 'normal',
    createdAt: '2026-08-05',
    status: 'Initiated',
  },
];
