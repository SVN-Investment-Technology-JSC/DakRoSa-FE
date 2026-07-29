'use client';

import { ArrowRight, FileCheck2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageHeading } from '@/components/page-heading';
import { Badge } from '@/components/ui/badge';
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
import { signaturesService } from '@/services/signatures.service';
import { formatDateTime } from '@/lib/format';
import { tenantPath } from '@/lib/navigation';
import type { SignatureRequest, SignatureStatus } from '@/types/e-office';

const signatureLabels: Record<SignatureStatus, string> = {
  pending: 'Chờ cấu hình',
  processing: 'Đang ký',
  completed: 'Hoàn tất',
  failed: 'Thất bại',
  cancelled: 'Đã hủy',
};

const signatureVariants = {
  pending: 'secondary',
  processing: 'default',
  completed: 'default',
  failed: 'destructive',
  cancelled: 'outline',
} as const;

export function SignaturesPage({ tenantSlug }: { tenantSlug: string }) {
  const [requests, setRequests] = useState<SignatureRequest[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void signaturesService.getRequests()
      .then((items) => {
        if (active) setRequests(items);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : 'Không thể tải hàng đợi ký số.',
        );
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageHeading
        eyebrow="Chữ ký số"
        title="Hàng đợi ký số"
        description="Theo dõi yêu cầu ký số độc lập nhà cung cấp. Kết nối thực tế sẽ được bật sau khi hoàn tất PoC và cấu hình chứng thư."
      />
      {error && (
        <div className="mb-4 rounded-xl border border-[#E7B5B3] bg-[#FCECEB] px-4 py-3 text-sm font-bold text-[#A83836]">
          {error}
        </div>
      )}
      <section className="overflow-hidden rounded-xl border border-[#DDE5DC] bg-white shadow-sm">
        {requests === null ? (
          <div className="grid gap-3 p-5">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <Empty><EmptyHeader><EmptyTitle>Chưa có yêu cầu ký số</EmptyTitle><EmptyDescription>Yêu cầu sẽ xuất hiện sau khi hồ sơ được phê duyệt và chuyển sang bước ký số.</EmptyDescription></EmptyHeader></Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hồ sơ</TableHead>
                <TableHead>Người yêu cầu</TableHead>
                <TableHead>Hình thức</TableHead>
                <TableHead>Nhà cung cấp</TableHead>
                <TableHead>Khởi tạo</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead aria-label="Mở hồ sơ" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <FileCheck2 size={17} />
                      </span>
                      <div>
                        <strong className="block max-w-sm text-[#2C342E]">
                          {request.submission.title}
                        </strong>
                        <span className="mt-1 block font-mono text-xs text-[#758077]">
                          {request.submission.code}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{request.requester.displayName}</TableCell>
                  <TableCell>Ký từ xa</TableCell>
                  <TableCell>
                    {request.provider === 'unconfigured'
                      ? 'Chưa cấu hình'
                      : request.provider}
                  </TableCell>
                  <TableCell>{formatDateTime(request.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant={signatureVariants[request.status]}>
                      {signatureLabels[request.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={tenantPath(
                        tenantSlug,
                        `/e-office/submissions/${request.submissionId}`,
                      )}
                      className="inline-grid size-9 place-items-center rounded-lg text-primary hover:bg-primary/10"
                      aria-label={`Mở hồ sơ ${request.submission.code}`}
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
