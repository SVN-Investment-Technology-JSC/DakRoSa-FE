export type WorkflowNodeType =
  | 'START'
  | 'HUMAN_TASK'
  | 'SERVICE_TASK'
  | 'CONDITION'
  | 'PARALLEL_SPLIT'
  | 'PARALLEL_JOIN'
  | 'END';

export type WorkflowAssigneeType =
  | 'USER'
  | 'ORGANIZATION_UNIT'
  | 'POSITION'
  | 'ROLE'
  | 'REQUEST_FIELD'
  | 'CREATOR'
  | 'PREVIOUS_STEP_ACTOR'
  | 'MANAGER_OF_REQUESTER';

export interface WorkflowFormField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'select' | 'checkbox' | 'file';
  required?: boolean;
  options?: string[];
  actions?: string[];
  accept?: string;
}

export interface WorkflowAssignee {
  id?: string;
  nodeId?: string;
  type: WorkflowAssigneeType;
  subjectId?: string | null;
  fieldKey?: string | null;
  strategy: 'ANY' | 'ALL' | 'QUORUM';
  quorum?: number | null;
  config: Record<string, unknown>;
}

export interface WorkflowNode {
  id?: string;
  versionId?: string;
  key: string;
  type: WorkflowNodeType;
  name: string;
  description?: string | null;
  config?: Record<string, unknown>;
  uiPosition?: { x?: number; y?: number };
}

export interface WorkflowRoleMapping {
  definitionId?: string;
  variableKey: string;
  mappedType: 'ROLE' | 'USER' | 'DEPT' | 'POSITION' | string;
  mappedValue: string;
}

export interface WorkflowTransition {
  id?: string;
  versionId?: string;
  sourceNodeId?: string;
  targetNodeId?: string;
  sourceKey?: string;
  targetKey?: string;
  actionKey: string;
  label: string;
  condition?: Record<string, unknown> | null;
  sortOrder: number;
}

export interface WorkflowVersion {
  id: string;
  definitionId: string;
  versionNumber: number;
  status: 'draft' | 'published' | 'retired';
  changelog: string | null;
  publishedAt: string | null;
  nodes?: WorkflowNode[];
  transitions?: WorkflowTransition[];
}

export interface WorkflowDefinition {
  id: string;
  tenantId: string;
  key: string;
  name: string;
  description: string | null;
  resourceType: string;
  status: 'draft' | 'published' | 'archived';
  currentVersionId: string | null;
  versions: WorkflowVersion[];
  graph?: {
    version: WorkflowVersion;
    nodes: WorkflowNode[];
    transitions: WorkflowTransition[];
  } | null;
  updatedAt: string;
}

export interface WorkflowDraftInput {
  nodes: WorkflowNode[];
  transitions: Array<{
    sourceKey: string;
    targetKey: string;
    actionKey: string;
    label: string;
    condition?: Record<string, unknown>;
    sortOrder?: number;
  }>;
  changelog?: string;
}

export interface WorkflowValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface WorkflowAvailableAction {
  taskId?: string;
  key: string;
  label: string;
  targetNodeId: string;
  requiredPermission?: string | null;
  formFields?: WorkflowFormField[];
}

export interface WorkflowInstance {
  id: string;
  status: 'running' | 'completed' | 'cancelled' | 'failed';
  currentNode?: WorkflowNode | null;
  availableActions: WorkflowAvailableAction[];
  tasks: Array<{
    id: string;
    name: string;
    status: string;
    dueAt: string | null;
    node: WorkflowNode;
  }>;
  actions: Array<{
    id: string;
    actionKey: string;
    note: string | null;
    createdAt: string;
    actor?: { displayName: string };
    fromNode?: WorkflowNode | null;
    toNode?: WorkflowNode | null;
  }>;
}

// =========================================================================
// Types cho CMMS Workflow Engine (Mini-map & Execution)
// =========================================================================

export interface CMMSWorkflowFormSchema {
  fields: WorkflowFormField[];
}

export interface CMMSWorkflowTransition {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  condition: 'APPROVED' | 'REJECTED' | 'DEFAULT';
  label: string | null;
}

export interface CMMSWorkflowNode {
  id: string;
  templateId: string;
  stepKey: string;
  name: string;
  type: 'start' | 'task' | 'approval' | 'condition' | 'end';
  assigneeType:
    | 'USER'
    | 'ROLE'
    | 'POSITION'
    | 'MANAGER_OF_REQUESTER'
    | 'PREVIOUS_STEP_ACTOR'
    | null;
  assigneeValue: string | null;
  assignmentStrategy: 'ANY' | 'ALL';
  slaMinutes: number | null;
  formSchema: CMMSWorkflowFormSchema | null;
  requiredPermissions: string[];
  positionX: number;
  positionY: number;
  outgoingTransitions: CMMSWorkflowTransition[];
}

export interface CMMSWorkflowTemplate {
  id: string;
  tenantId: string;
  key: string;
  version: number;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived';
  startNodeId: string | null;
  nodes: CMMSWorkflowNode[];
  createdAt: string;
  updatedAt: string;
}

// Notification types
export interface AppNotification {
  id: string;
  tenantId: string;
  userId: string;
  type:
    | 'work_order_assigned'
    | 'work_order_sla_warning'
    | 'work_order_overdue'
    | 'workflow_task_assigned'
    | 'workflow_task_rejected'
    | 'workflow_completed';
  title: string;
  body: string | null;
  actionUrl: string | null;
  payload: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}
