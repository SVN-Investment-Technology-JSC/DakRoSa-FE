export const WORKFLOW_REQUEST_STATUSES = ['Initiated', 'Triage', 'In Progress', 'Completed'] as const;
export type WorkflowRequestStatus = (typeof WORKFLOW_REQUEST_STATUSES)[number];

export const WORKFLOW_REQUEST_PRIORITIES = ['low', 'normal', 'high'] as const;
export type WorkflowRequestPriority = (typeof WORKFLOW_REQUEST_PRIORITIES)[number];
