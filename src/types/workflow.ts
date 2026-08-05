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

export type WorkflowAssignmentRole = 'EXECUTOR' | 'OBSERVER';

export interface WorkflowFormField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'select';
  required?: boolean;
  options?: string[];
  actions?: string[];
}

export interface WorkflowAssignee {
  id?: string;
  nodeId?: string;
  type: WorkflowAssigneeType;
  subjectId?: string | null;
  fieldKey?: string | null;
  strategy: 'ANY' | 'ALL' | 'QUORUM';
  quorum?: number | null;
  assigneeVariableKey?: string | null;
  assignmentRole?: WorkflowAssignmentRole;
  config: Record<string, unknown>;
}

export type WorkflowRoleMappingTargetType =
  | 'USER'
  | 'ROLE'
  | 'POSITION'
  | 'ORGANIZATION_UNIT';

export interface WorkflowRoleMapping {
  id?: string;
  definitionId?: string;
  variableKey: string;
  targetType: WorkflowRoleMappingTargetType;
  targetId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowRoleMappingBoard {
  definitionId: string;
  mappings: WorkflowRoleMapping[];
}

export interface WorkflowMasterBoardDefinition {
  id: string;
  key: string;
  name: string;
  status: 'draft' | 'published' | 'archived';
  requiredVariableKeys: string[];
}

export interface WorkflowGlobalMasterBoard {
  definitions: WorkflowMasterBoardDefinition[];
  mappings: WorkflowRoleMapping[];
}

export interface WorkflowNode {
  id?: string;
  versionId?: string;
  key: string;
  type: WorkflowNodeType;
  name: string;
  description?: string | null;
  config: Record<string, unknown>;
  uiPosition: { x?: number; y?: number };
  assignees: WorkflowAssignee[];
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
