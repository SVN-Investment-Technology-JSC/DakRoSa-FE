import { Badge } from '@/components/ui/badge';
import type {
  SubmissionPriority,
  SubmissionStatus,
} from '@/types/e-office';

const statusLabels: Record<SubmissionStatus, string> = {
  draft: 'Bản nháp',
  in_review: 'Chờ duyệt',
  returned: 'Đã trả lại',
  approved: 'Đã phê duyệt',
  cancelled: 'Đã hủy',
};

const statusVariants = {
  draft: 'secondary',
  in_review: 'secondary',
  returned: 'destructive',
  approved: 'default',
  cancelled: 'outline',
} as const;

const priorityLabels: Record<SubmissionPriority, string> = {
  normal: 'Bình thường',
  high: 'Cao',
  urgent: 'Khẩn',
};

export function SubmissionStatusBadge({
  status,
}: {
  status: SubmissionStatus;
}) {
  return (
    <Badge variant={statusVariants[status]}>
      <span className="size-1.5 rounded-full bg-current" />
      {statusLabels[status]}
    </Badge>
  );
}

export function SubmissionPriorityBadge({
  priority,
}: {
  priority: SubmissionPriority;
}) {
  return (
    <Badge
      variant={
        priority === 'urgent'
          ? 'destructive'
          : priority === 'high'
            ? 'secondary'
            : 'outline'
      }
    >
      {priorityLabels[priority]}
    </Badge>
  );
}

export { statusLabels, priorityLabels };
