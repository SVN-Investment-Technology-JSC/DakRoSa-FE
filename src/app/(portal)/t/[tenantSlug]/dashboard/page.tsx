'use client';

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Files,
  ListTodo,
  Plus,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageHeading } from '@/components/page-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest, ApiError } from '@/lib/api';
import { tenantPath } from '@/lib/navigation';
import { useAuth } from '@/providers/auth-provider';
import { SubmissionSummary } from '@/types/e-office';

interface PlatformSummary {
  users: number;
  activeUsers: number;
  roles: number;
  eventsToday: number;
}

export default function TenantDashboardPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { user } = useAuth();
  const [platform, setPlatform] = useState<PlatformSummary | null>(null);
  const [office, setOffice] = useState<SubmissionSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void Promise.all([
      apiRequest<PlatformSummary>('/dashboard/summary'),
      apiRequest<SubmissionSummary>('/e-office/summary'),
    ])
      .then(([platformSummary, officeSummary]) => {
        if (!active) return;
        setPlatform(platformSummary);
        setOffice(officeSummary);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : 'Không thể tải dữ liệu tổng quan.',
        );
      });
    return () => {
      active = false;
    };
  }, []);

  const metrics = [
    {
      label: 'Việc chờ bạn xử lý',
      value: office?.inReview,
      note: 'Hồ sơ đang trong luồng duyệt',
      icon: ListTodo,
      tone: 'bg-[#FFF3D8] text-[#745C27]',
    },
    {
      label: 'Hồ sơ đã phê duyệt',
      value: office?.approved,
      note: 'Sẵn sàng chuyển sang ký số',
      icon: CheckCircle2,
      tone: 'bg-[#E8F5EA] text-[#386948]',
    },
    {
      label: 'Hồ sơ cần bổ sung',
      value: office?.returned,
      note: 'Đã được người duyệt trả lại',
      icon: Clock3,
      tone: 'bg-[#FCECEB] text-[#A83836]',
    },
    {
      label: 'Người dùng hoạt động',
      value: platform?.activeUsers,
      note: `${platform?.users ?? 0} tài khoản trong doanh nghiệp`,
      icon: Users,
      tone: 'bg-[#EEF1ED] text-[#59615A]',
    },
  ];

  return (
    <>
      <PageHeading
        eyebrow="Giai đoạn 3 · Không gian doanh nghiệp"
        title={`Chào ${user?.displayName ?? 'bạn'}`}
        description="Tổng hợp các hồ sơ cần chú ý và tình trạng triển khai phân hệ trong doanh nghiệp đang truy cập."
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

      {error && (
        <div className="mb-5 rounded-xl border border-[#E7B5B3] bg-[#FCECEB] px-4 py-3 text-sm font-bold text-[#A83836]">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, note, icon: Icon, tone }) => (
          <Card key={label} className="gap-4 rounded-xl border-[#DDE5DC]">
            <CardHeader className="flex grid-cols-none flex-row items-start justify-between gap-4 px-5 pt-5">
              <div>
                <p className="text-xs font-extrabold tracking-[0.06em] text-[#667067] uppercase">
                  {label}
                </p>
                {value === undefined ? (
                  <Skeleton className="mt-3 h-9 w-16" />
                ) : (
                  <strong className="font-display mt-2 block text-3xl text-[#2C342E]">
                    {value}
                  </strong>
                )}
              </div>
              <span className={`grid size-10 place-items-center rounded-xl ${tone}`}>
                <Icon size={20} />
              </span>
            </CardHeader>
            <CardContent className="px-5 pb-5 text-xs leading-5 text-[#758077]">
              {note}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <Card className="gap-0 overflow-hidden rounded-xl border-[#DDE5DC]">
          <CardHeader className="border-b border-[#E4EAE2] px-5 py-4">
            <h2 className="font-display text-lg font-bold">
              Tiến độ các phân hệ Giai đoạn 3
            </h2>
            <p className="text-sm text-[#667067]">
              Trạng thái phản ánh phần đã có luồng nghiệp vụ và API hoạt động.
            </p>
          </CardHeader>
          <CardContent className="divide-y divide-[#E8EDE6] px-0 pb-0">
            {[
              {
                name: 'E-Office & hồ sơ trình ký',
                detail: 'Tạo, gửi duyệt, phê duyệt, trả lại và lịch sử xử lý',
                state: 'Đang triển khai',
                icon: Files,
                active: true,
              },
              {
                name: 'Chữ ký số',
                detail: 'Hàng đợi trung lập nhà cung cấp, sẵn sàng nối PoC',
                state: 'Nền tảng sẵn sàng',
                icon: FileCheck2,
                active: true,
              },
              {
                name: 'HRM & chấm công',
                detail: 'Sẽ triển khai trên cùng tenant, site và RBAC',
                state: 'Đợt kế tiếp',
                icon: Users,
                active: false,
              },
            ].map(({ name, detail, state, icon: Icon, active }) => (
              <div key={name} className="flex items-center gap-4 px-5 py-4">
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                    active
                      ? 'bg-[#E8F3E8] text-[#386948]'
                      : 'bg-[#F0F2EF] text-[#7C847D]'
                  }`}
                >
                  <Icon size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <strong className="block text-sm">{name}</strong>
                  <span className="mt-1 block text-xs leading-5 text-[#758077]">
                    {detail}
                  </span>
                </div>
                <span className="hidden rounded-full bg-[#F0F5EE] px-3 py-1 text-xs font-bold text-[#59615A] sm:block">
                  {state}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden rounded-xl border-0 bg-[#386948] text-white shadow-[0_18px_42px_rgba(56,105,72,0.18)]">
          <CardHeader className="px-6 pt-6">
            <span className="mb-2 w-fit rounded-full bg-[#B9EFC5] px-3 py-1 text-xs font-black text-[#2B5D3C]">
              Việc cần ưu tiên
            </span>
            <h2 className="font-display text-xl font-bold">
              Xử lý hồ sơ đang chờ
            </h2>
            <p className="text-sm leading-6 text-white/70">
              Mở danh sách công việc được phân công cho tài khoản của bạn.
            </p>
          </CardHeader>
          <CardContent className="mt-auto px-6 pb-6">
            <Link
              href={tenantPath(tenantSlug, '/work-items')}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#B9EFC5] px-4 text-sm font-black text-[#234D32] transition hover:bg-[#C9F4D1]"
            >
              Mở việc cần xử lý <ArrowRight size={17} />
            </Link>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
