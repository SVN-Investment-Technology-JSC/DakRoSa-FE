import { cn } from '@/lib/utils';

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-lg bg-[#E3EBE1]', className)}
    />
  );
}

export { Skeleton };
