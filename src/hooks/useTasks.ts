import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateTaskDto,
  TaskStatus,
  approveStep,
  createTask,
  delegateStep,
  getDelegationCandidates,
  getTask,
  getTasks,
  getValidRollbackTargetsForTask,
  rejectStep,
} from '../api/tasks';
import { RoleLetter } from '../api/workflows';

const TASKS_KEY = ['tasks'];
const taskKey = (id: string) => ['tasks', id];

export function useTasks(filter?: { status?: TaskStatus; assignedToMe?: boolean }) {
  return useQuery({
    queryKey: [...TASKS_KEY, filter ?? {}],
    queryFn: () => getTasks(filter),
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: taskKey(id ?? ''),
    queryFn: () => getTask(id as string),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTaskDto) => createTask(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useTaskRollbackTargets(taskId: string | undefined, stepId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', taskId, 'steps', stepId, 'valid-rollback-targets'],
    queryFn: () => getValidRollbackTargetsForTask(taskId as string, stepId as string),
    enabled: !!taskId && !!stepId,
  });
}

export function useApproveStep(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stepId, notes, roleLetter }: { stepId: string; notes?: string; roleLetter?: RoleLetter }) =>
      approveStep(taskId, stepId, { notes, roleLetter }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKey(taskId) });
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}

export function useRejectStep(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      stepId,
      notes,
      targetStepId,
      roleLetter,
    }: {
      stepId: string;
      notes: string;
      targetStepId?: string;
      roleLetter?: RoleLetter;
    }) => rejectStep(taskId, stepId, { notes, targetStepId, roleLetter }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKey(taskId) });
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}

export function useDelegationCandidates(taskId: string | undefined, stepId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', taskId, 'steps', stepId, 'delegation-candidates'],
    queryFn: () => getDelegationCandidates(taskId as string, stepId as string),
    enabled: !!taskId && !!stepId,
  });
}

export function useDelegateStep(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stepId, toUserId, roleLetter }: { stepId: string; toUserId: string; roleLetter?: RoleLetter }) =>
      delegateStep(taskId, stepId, { toUserId, roleLetter }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKey(taskId) });
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}
