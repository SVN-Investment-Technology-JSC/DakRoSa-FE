'use client';

import { Skeleton } from '@/components/ui/skeleton';
import type { TenantTableSkeletonProps } from '@/types/store';

export function TenantTableSkeleton({ rows = 5 }: TenantTableSkeletonProps) {
  return (
    <div className="grid gap-2 p-4">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  );
}
