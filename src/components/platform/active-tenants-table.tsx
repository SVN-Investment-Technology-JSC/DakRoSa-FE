'use client';

import { Archive, Building2, RotateCcw, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Popconfirm } from 'antd';
import { toast } from 'sonner';
import { TenantTableSkeleton } from '@/components/platform/tenant-table-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  archivePlatformTenant,
  fetchActiveTenants,
} from '@/store/platform-tenants.slice';
import type { PlatformTenant } from '@/types/platform-tenancy';

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Không thể lưu trữ doanh nghiệp.';
}

export function ActiveTenantsTable() {
  const dispatch = useAppDispatch();
  const { active, activeStatus } = useAppSelector(
    (state) => state.platformTenants,
  );
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const handleArchive = async (tenant: PlatformTenant) => {
    if (archivingId) return;
    setArchivingId(tenant.id);
    try {
      await dispatch(archivePlatformTenant(tenant.id)).unwrap();
      toast.success(`Đã lưu trữ doanh nghiệp ${tenant.shortName}.`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Doanh nghiệp đang hoạt động</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeStatus === 'succeeded'
              ? `${active.length} doanh nghiệp`
              : 'Đang đồng bộ dữ liệu…'}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={activeStatus === 'loading'}
          onClick={() => void dispatch(fetchActiveTenants({ force: true }))}
        >
          <RotateCcw
            className={activeStatus === 'loading' ? 'animate-spin' : ''}
          />
          Làm mới
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {activeStatus === 'idle' || activeStatus === 'loading' ? (
          <TenantTableSkeleton />
        ) : active.length === 0 ? (
          <Empty className="m-6 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Building2 />
              </EmptyMedia>
              <EmptyTitle>Chưa có doanh nghiệp hoạt động</EmptyTitle>
              <EmptyDescription>
                Tạo doanh nghiệp đầu tiên để bắt đầu cấu hình hệ thống.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doanh nghiệp</TableHead>
                <TableHead>Mã / URL</TableHead>
                <TableHead>Địa phương hóa</TableHead>
                <TableHead>Quy mô</TableHead>
                <TableHead>Phân hệ</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span
                        className="grid size-10 shrink-0 place-items-center rounded-lg text-xs font-black text-white"
                        style={{ backgroundColor: tenant.primaryColor }}
                      >
                        {tenant.shortName.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <strong className="block max-w-64 truncate">
                          {tenant.name}
                        </strong>
                        <span className="text-xs text-muted-foreground">
                          {tenant.shortName}
                        </span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{tenant.code}</Badge>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      /t/{tenant.slug}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="block">{tenant.locale}</span>
                    <span className="text-xs text-muted-foreground">
                      {tenant.timezone}
                    </span>
                  </TableCell>
                  <TableCell>
                    {tenant.siteCount ?? 0} địa điểm
                    <span className="block text-xs text-muted-foreground">
                      {tenant.memberCount ?? 0} người dùng
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {
                        tenant.enabledModules.filter(
                          (module) => module !== 'core',
                        ).length
                      }{' '}
                      phân hệ
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button asChild type="button" size="sm" variant="outline">
                        <Link href={`/platform/tenants/${tenant.id}`}>
                          <Settings2 />
                          Cấu hình
                        </Link>
                      </Button>
                      <Popconfirm
                        title="Lưu trữ doanh nghiệp?"
                        description={`${tenant.name} sẽ ngừng hoạt động cho đến khi được khôi phục.`}
                        okText="Lưu trữ"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleArchive(tenant)}
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={archivingId === tenant.id}
                        >
                          <Archive />
                          {archivingId === tenant.id
                            ? 'Đang lưu trữ…'
                            : 'Lưu trữ'}
                        </Button>
                      </Popconfirm>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
