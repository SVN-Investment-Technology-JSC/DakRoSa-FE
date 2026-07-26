'use client';

import { ArrowRight, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  SubmissionPriorityBadge,
  SubmissionStatusBadge,
} from '@/components/e-office/submission-badges';
import { PageHeading } from '@/components/page-heading';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiRequest, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { tenantPath } from '@/lib/navigation';
import { SubmissionList, SubmissionStatus } from '@/types/e-office';

export default function SubmissionsPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [result, setResult] = useState<SubmissionList | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SubmissionStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSubmissions = useCallback(
    (nextSearch = '', nextStatus = '') => {
    const query = new URLSearchParams({ page: '1', limit: '50' });
    if (nextSearch.trim()) query.set('search', nextSearch.trim());
    if (nextStatus) query.set('status', nextStatus);
      return apiRequest<SubmissionList>(
        `/e-office/submissions?${query.toString()}`,
      );
    },
    [],
  );

  const load = useCallback(async (nextSearch = '', nextStatus = '') => {
    try {
      setResult(await fetchSubmissions(nextSearch, nextStatus));
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : 'Không thể tải danh sách hồ sơ.',
      );
    } finally {
      setLoading(false);
    }
  }, [fetchSubmissions]);

  useEffect(() => {
    let active = true;
    void fetchSubmissions()
      .then((data) => {
        if (active) setResult(data);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : 'Không thể tải danh sách hồ sơ.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchSubmissions]);

  const handleFilter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    void load(search, status);
  };

  return (
    <>
      <PageHeading
        eyebrow="E-Office"
        title="Hồ sơ trình ký"
        description="Quản lý hồ sơ từ lúc soạn thảo đến phê duyệt; mọi thay đổi đều được ghi nhận theo doanh nghiệp."
        actions={
          <Button asChild size="sm">
            <Link
              href={tenantPath(
                tenantSlug,
                '/e-office/submissions/new',
              )}
            >
              <Plus size={17} /> Tạo hồ sơ
            </Link>
          </Button>
        }
      />

      <form
        onSubmit={handleFilter}
        className="mb-4 grid gap-3 rounded-xl border border-[#DDE5DC] bg-white p-3 shadow-sm sm:grid-cols-[minmax(240px,1fr)_220px_auto]"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#7C847D]" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo mã hoặc tiêu đề hồ sơ"
            className="pl-10"
          />
        </div>
        <NativeSelect
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as SubmissionStatus | '')
          }
        >
          <option value="">Tất cả trạng thái</option>
          <option value="draft">Bản nháp</option>
          <option value="in_review">Chờ duyệt</option>
          <option value="returned">Đã trả lại</option>
          <option value="approved">Đã phê duyệt</option>
          <option value="cancelled">Đã hủy</option>
        </NativeSelect>
        <Button type="submit" variant="secondary" disabled={loading}>
          Lọc dữ liệu
        </Button>
      </form>

      {error && (
        <div className="mb-4 rounded-xl border border-[#E7B5B3] bg-[#FCECEB] px-4 py-3 text-sm font-bold text-[#A83836]">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-[#DDE5DC] bg-white shadow-sm">
        {loading ? (
          <div className="grid gap-3 p-5">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : !result?.items.length ? (
          <EmptyState
            title="Chưa có hồ sơ phù hợp"
            description="Thay đổi điều kiện lọc hoặc tạo hồ sơ đầu tiên cho doanh nghiệp."
            action={
              <Button asChild size="sm">
                <Link
                  href={tenantPath(
                    tenantSlug,
                    '/e-office/submissions/new',
                  )}
                >
                  <Plus size={16} /> Tạo hồ sơ
                </Link>
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hồ sơ</TableHead>
                  <TableHead>Loại văn bản</TableHead>
                  <TableHead>Ưu tiên</TableHead>
                  <TableHead>Người trình</TableHead>
                  <TableHead>Cập nhật</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead aria-label="Mở chi tiết" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <strong className="block max-w-md text-[#2C342E]">
                        {item.title}
                      </strong>
                      <span className="mt-1 block font-mono text-xs text-[#758077]">
                        {item.code}
                      </span>
                    </TableCell>
                    <TableCell>{item.documentType}</TableCell>
                    <TableCell>
                      <SubmissionPriorityBadge priority={item.priority} />
                    </TableCell>
                    <TableCell>{item.requester.displayName}</TableCell>
                    <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
                    <TableCell>
                      <SubmissionStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={tenantPath(
                          tenantSlug,
                          `/e-office/submissions/${item.id}`,
                        )}
                        className="inline-grid size-9 place-items-center rounded-lg text-[#386948] hover:bg-[#EAF3E8]"
                        aria-label={`Mở hồ sơ ${item.code}`}
                      >
                        <ArrowRight size={18} />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <footer className="border-t border-[#E4EAE2] bg-[#FAFCF8] px-4 py-3 text-xs font-bold text-[#667067]">
              Hiển thị {result.items.length} trên {result.total} hồ sơ
            </footer>
          </>
        )}
      </section>
    </>
  );
}
