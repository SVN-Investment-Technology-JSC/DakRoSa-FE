import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  RaciCellTarget,
  RaciTagInput,
  getRoleLetterOptions,
  getValidRollbackTargets,
  replaceCellAssignments,
} from '../api/raci';

export function useRoleLetterOptions(workflowId: string | undefined) {
  return useQuery({
    queryKey: ['workflows', workflowId, 'role-letter-options'],
    queryFn: () => getRoleLetterOptions(workflowId as string),
    enabled: !!workflowId,
  });
}

export function useValidRollbackTargets(workflowId: string | undefined, stepId: string | undefined) {
  return useQuery({
    queryKey: ['workflows', workflowId, 'steps', stepId, 'valid-rollback-targets'],
    queryFn: () => getValidRollbackTargets(workflowId as string, stepId as string),
    enabled: !!workflowId && !!stepId,
  });
}

export function useReplaceCellAssignments(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stepId, tags, ...target }: RaciCellTarget & { stepId: string; tags: RaciTagInput[] }) =>
      replaceCellAssignments(workflowId, stepId, { ...target, tags }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflows', workflowId] }),
  });
}
