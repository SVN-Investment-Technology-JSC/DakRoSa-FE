import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateWorkflowRequestDto,
  WorkflowRequestStatus,
  createWorkflowRequest,
  getWorkflowRequest,
  getWorkflowRequests,
  triageWorkflowRequest,
} from '../api/workflowRequests';

const REQUESTS_KEY = ['workflow-requests'];
const requestKey = (id: string) => ['workflow-requests', id];

export function useWorkflowRequests(status?: WorkflowRequestStatus) {
  return useQuery({
    queryKey: [...REQUESTS_KEY, status ?? 'all'],
    queryFn: () => getWorkflowRequests(status),
  });
}

export function useWorkflowRequest(id: string | undefined) {
  return useQuery({
    queryKey: requestKey(id ?? ''),
    queryFn: () => getWorkflowRequest(id as string),
    enabled: !!id,
  });
}

export function useCreateWorkflowRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateWorkflowRequestDto) => createWorkflowRequest(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: REQUESTS_KEY }),
  });
}

export function useTriageWorkflowRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, workflowId, orgUnitId }: { id: string; workflowId: string; orgUnitId: string }) =>
      triageWorkflowRequest(id, { workflowId, orgUnitId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: REQUESTS_KEY });
      queryClient.invalidateQueries({ queryKey: requestKey(variables.id) });
    },
  });
}
