'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  SubmissionPriorityBadge,
  SubmissionStatusBadge,
} from '@/components/e-office/submission-badges';
import { PageHeading } from '@/components/page-heading';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiError } from '@/services/service-error';
import { eOfficeService } from '@/services/e-office.service';
import { formatDate } from '@/lib/format';
import { tenantPath } from '@/lib/navigation';
import type { Submission } from '@/types/e-office';

export function WorkItemsPage({ tenantSlug }: { tenantSlug: string }) {
  const [items, setItems] = useState<Submission[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void eOfficeService.getWorkItems()
      .then((result) => {
        if (active) setItems(result.items);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : 'Không thể tải danh sách công việc.',
        );
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageHeading
        eyebrow="Không gian làm việc"
        title="Việc cần xử lý"
        description="Các hồ sơ đang ở bước phê duyệt và được phân công trực tiếp cho bạn."
      />
      {error && (
        <div className="mb-5 rounded-xl border border-[#E7B5B3] bg-[#FCECEB] px-4 py-3 text-sm font-bold text-[#A83836]">
          {error}
        </div>
      )}
      <section className="overflow-hidden rounded-xl border border-[#DDE5DC] bg-white shadow-sm">
        {items === null ? (
          <div className="grid gap-3 p-5">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Empty><EmptyHeader><EmptyTitle>Không có hồ sơ chờ xử lý</EmptyTitle><EmptyDescription>Khi một hồ sơ được phân công cho bạn, hồ sơ sẽ xuất hiện tại đây.</EmptyDescription></EmptyHeader></Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hồ sơ</TableHead>
                <TableHead>Người trình</TableHead>
                <TableHead>Ưu tiên</TableHead>
                <TableHead>Hạn xử lý</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead aria-label="Mở chi tiết" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <strong className="block text-[#2C342E]">
                      {item.title}
                    </strong>
                    <span className="mt-1 block text-xs text-[#758077]">
                      {item.code} · {item.documentType}
                    </span>
                  </TableCell>
                  <TableCell>{item.requester.displayName}</TableCell>
                  <TableCell>
                    <SubmissionPriorityBadge priority={item.priority} />
                  </TableCell>
                  <TableCell>{formatDate(item.dueAt)}</TableCell>
                  <TableCell>
                    <SubmissionStatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={tenantPath(
                        tenantSlug,
                        `/e-office/submissions/${item.id}`,
                      )}
                      className="inline-grid size-9 place-items-center rounded-lg text-primary hover:bg-primary/10"
                      aria-label={`Mở hồ sơ ${item.code}`}
                    >
                      <ArrowRight size={18} />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </>
  );
}
