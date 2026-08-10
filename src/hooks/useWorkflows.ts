import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApiWorkflow,
  WorkflowKind,
  addWorkflowStep,
  updateWorkflowStep,
  createWorkflow,
  getWorkflow,
  getWorkflows,
} from '../api/workflows';

const WORKFLOWS_KEY = ['workflows'];
const workflowKey = (id: string) => ['workflows', id];

export function useWorkflows(kind?: WorkflowKind) {
  return useQuery({ queryKey: [...WORKFLOWS_KEY, kind ?? 'all'], queryFn: () => getWorkflows(kind) });
}

export function useWorkflow(id: string | undefined) {
  return useQuery({
    queryKey: workflowKey(id ?? ''),
    queryFn: () => getWorkflow(id as string),
    enabled: !!id,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { code: string; name: string; description?: string; kind: WorkflowKind }) =>
      createWorkflow(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WORKFLOWS_KEY }),
  });
}

export function useUpdateWorkflowStep(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      stepId: string;
      stepName?: string;
      linkedSubFlowId?: string | null;
    }) => updateWorkflowStep(workflowId, vars.stepId, vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...WORKFLOWS_KEY, workflowId] });
      queryClient.invalidateQueries({ queryKey: WORKFLOWS_KEY });
    },
  });
}

export function useAddWorkflowStep(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { stepOrder: number; stepCode: string; stepName: string; icon?: string; linkedSubFlowId?: string }) =>
      addWorkflowStep(workflowId, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workflowKey(workflowId) }),
  });
}

export type { ApiWorkflow };
