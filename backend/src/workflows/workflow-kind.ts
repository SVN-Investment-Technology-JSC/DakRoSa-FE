export const WORKFLOW_KINDS = ['process', 'maintenance_linked', 'maintenance_direct'] as const;
export type WorkflowKind = (typeof WORKFLOW_KINDS)[number];
