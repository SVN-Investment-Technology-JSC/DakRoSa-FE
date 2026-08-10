import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAttachmentUrl,
  getBreakdownCandidates,
  getSubtasks,
  replaceSubtasks,
  submitSubtask,
  uploadAttachment,
} from '../api/execution';

const subtasksKey = (taskId: string, stepId: string) => ['tasks', taskId, 'steps', stepId, 'subtasks'];

export function useSubtasks(taskId: string | undefined, stepId: string | undefined) {
  return useQuery({
    queryKey: subtasksKey(taskId ?? '', stepId ?? ''),
    queryFn: () => getSubtasks(taskId as string, stepId as string),
    enabled: !!taskId && !!stepId,
  });
}

export function useBreakdownCandidates(taskId: string | undefined, stepId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', taskId, 'steps', stepId, 'breakdown-candidates'],
    queryFn: () => getBreakdownCandidates(taskId as string, stepId as string),
    enabled: !!taskId && !!stepId,
  });
}

export function useReplaceSubtasks(taskId: string, stepId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subtasks: Array<{ assigneeUserId: string; title: string; weight?: number }>) =>
      replaceSubtasks(taskId, stepId, subtasks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subtasksKey(taskId, stepId) });
      // Re-breaking down the work resets the parent step's progress to 0.
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
    },
  });
}

export function useUploadAttachment(taskId: string, stepId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { subtaskId: string; file: File }) =>
      uploadAttachment(taskId, stepId, vars.subtaskId, vars.file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subtasksKey(taskId, stepId) }),
  });
}

export function useSubmitSubtask(taskId: string, stepId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { subtaskId: string; note?: string }) =>
      submitSubtask(taskId, stepId, vars.subtaskId, vars.note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subtasksKey(taskId, stepId) });
      // Submitting can finish the whole step and advance the task.
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

/**
 * Opens an attachment in a new tab. The URL is presigned and short-lived, so it
 * is fetched on demand rather than embedded in the list response.
 */
export async function openAttachment(
  taskId: string,
  stepId: string,
  subtaskId: string,
  attachmentId: string,
): Promise<void> {
  const { url } = await getAttachmentUrl(taskId, stepId, subtaskId, attachmentId);
  window.open(url, '_blank', 'noopener,noreferrer');
}
