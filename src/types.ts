export type NavTab =
  | 'workspace'
  | 'canvas'
  | 'submitter'
  | 'maintenance-dashboard'
  | 'org-chart'
  | 'raci'
  | 'maintenance-config';

// --- RACI Matrix Types ---
export interface RoleColumn {
  id: string;
  title: string;
  isWarningContext?: boolean;
}

export interface DepartmentGroup {
  id: string;
  name: string;
  isCollapsed?: boolean;
  roles: RoleColumn[];
}

export interface WorkflowStep {
  id: string;
  icon?: string;
  stepName: string;
  hasError?: boolean;
  hasWarning?: boolean;
  // roleId -> letter ('R' | 'C' | 'S' | 'I' | 'E' | '')
  assignments: Record<string, string>;
  linkedSubFlowId?: string;
  linkedSubFlowName?: string;
}

export interface WorkflowGroup {
  id: string;
  code?: string;
  workflowName: string;
  description?: string;
  isExpanded?: boolean;
  // For maintenance workflows: 'linked' (automatic derivative from process approval, no S) vs 'direct' (standalone flow with S)
  flowType?: 'linked' | 'direct';
  steps: WorkflowStep[];
}

export interface MatrixRow {
  id: string;
  icon: string;
  stepName: string;
  hasError?: boolean;
  hasWarning?: boolean;
  assignments: Record<string, string>;
}

// --- Org Chart Types ---
export interface NodeTypeConfig {
  id: string;
  name: string;
  colorClass: string;
  hexColor: string;
}

export interface Personnel {
  id: string;
  name: string;
  title: string;
  avatarInitials: string;
  avatarBg?: string;
  isHead?: boolean;
}

export interface OrgNode {
  id: string;
  typeId: string;
  typeName: string;
  typeColor: string;
  title: string;
  head?: Personnel;
  children?: OrgNode[];
  isActive?: boolean;
}

// --- Maintenance Config Types ---
export type MaintenanceFrequency = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface MaintenancePartItem {
  id: string;
  name: string;
  selectedFrequency: MaintenanceFrequency;
}

// --- Workspace Types ---
export interface SubTask {
  id: string;
  code: string; // e.g. E(1)
  assignee: string;
  details: string;
  weight: number;
  status: 'DONE' | 'ACTIVE' | 'PENDING';
}

export interface WorkflowCanvasStepNode {
  id: string;
  stepName: string;
  roleAssigned: string; // e.g. "Reviewer (R): Lead Dev"
  status: 'Completed' | 'In Progress' | 'Pending';
  progress?: number;
  isDerivative?: boolean;
  linkedSubFlowId?: string;
  linkedSubFlowTitle?: string;
  linkedSubFlowNodes?: WorkflowCanvasStepNode[];
}

export interface WorkspaceTask {
  id: string;
  title: string;
  referenceCode: string;
  referenceTitle: string;
  workflowId?: string; // ID of workflow archetype from RCSI Matrix
  workflowType: 'process' | 'maintenance_direct' | 'maintenance_linked';
  status: 'Active' | 'Pending' | 'Completed' | 'Rejected';
  dueDate: string;
  initiator: string;
  department: string;
  priority: 'High' | 'Normal' | 'Low';
  taskId: string;
  description: string;
  originalFiles: Array<{ name: string; size: string; type: 'excel' | 'pdf' | 'doc' }>;
  subTasks: SubTask[];
  checkerRole: string;
  subordinates: Array<{ id: string; name: string; role: string }>;
  canvasNodes?: WorkflowCanvasStepNode[];
  derivativeFlowId?: string; // If process approval automatically spawns derivative maintenance flow
  derivativeFlowTitle?: string;
  derivativeCanvasNodes?: WorkflowCanvasStepNode[];
}

// --- Submitter Types ---
export interface WorkflowRequest {
  id: string;
  workflowType: string;
  title: string;
  description: string;
  priority: 'low' | 'normal' | 'high';
  createdAt: string;
  status: 'Initiated' | 'Triage' | 'In Progress' | 'Completed';
  attachedFileName?: string;
}

// --- Maintenance Dashboard Types ---
export type TicketStatus = 'CRITICAL' | 'WARNING' | 'ROUTINE';

export interface AlertTicket {
  id: string;
  ticketNumber: string;
  systemComponent: string;
  details: string;
  deadlineText: string;
  deadlineType: 'today' | '2days' | '3days' | 'normal';
  status: TicketStatus;
  priority: 'High' | 'Medium' | 'Low';
  workOrderCreated?: boolean;
}

// --- Canvas View Types ---
export interface CanvasNodeData {
  id: string;
  code: string;
  title: string;
  status: 'Complete' | 'Processing' | 'Pending' | 'Queued';
  progress?: number;
  type?: 'standard' | 'execution' | 'maintenance';
  group?: 'main' | 'maintenance';
}
