import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'grid min-h-64 place-content-center justify-items-center px-6 py-12 text-center',
        className,
      )}
    >
      <span className="mb-4 grid size-12 place-items-center rounded-full bg-[#E8F3E8] text-[#386948]">
        <Inbox size={22} />
      </span>
      <h3 className="font-display text-lg font-bold text-[#2C342E]">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#667067]">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
