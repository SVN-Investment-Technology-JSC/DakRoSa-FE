import { useQuery } from '@tanstack/react-query';
import { getTaskActivity } from '../api/activity';

export function useTaskActivity(taskId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', taskId, 'activity'],
    queryFn: () => getTaskActivity(taskId as string),
    enabled: !!taskId,
  });
}
