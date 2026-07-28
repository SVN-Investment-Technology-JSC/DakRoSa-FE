'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ActiveTenantsTable } from '@/components/platform/active-tenants-table';
import { ArchivedTenantsDialog } from '@/components/platform/archived-tenants-dialog';
import { CreateTenantDialog } from '@/components/platform/create-tenant-dialog';
import { PageHeading } from '@/components/page-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchActiveTenants } from '@/store/platform-tenants.slice';
import type { PlatformTenantInitialAdmin } from '@/types/platform-tenancy';

export default function PlatformTenantsPage() {
  const dispatch = useAppDispatch();
  const activeError = useAppSelector(
    (state) => state.platformTenants.activeError,
  );
  const [initialAdmin, setInitialAdmin] =
    useState<PlatformTenantInitialAdmin | null>(null);

  useEffect(() => {
    void dispatch(fetchActiveTenants({}));
  }, [dispatch]);

  useEffect(() => {
    if (activeError) toast.error(activeError);
  }, [activeError]);

  return (
    <>
      <PageHeading
        eyebrow="Platform administration"
        title="Quản trị đa doanh nghiệp"
        description="Quản lý tập trung doanh nghiệp, nhận diện và các phân hệ được cấp quyền sử dụng."
        actions={
          <>
            <ArchivedTenantsDialog />
            <CreateTenantDialog onCreated={setInitialAdmin} />
          </>
        }
      />

      {initialAdmin && (
        <Card className="mb-5 border-primary/25 bg-primary/5">
          <CardContent className="flex flex-col gap-2 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p>
              <strong>Tài khoản quản trị ban đầu:</strong>{' '}
              <code>@{initialAdmin.username}</code> · Mật khẩu:{' '}
              <code>{initialAdmin.password}</code>
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setInitialAdmin(null)}
            >
              Đã lưu lại
            </Button>
          </CardContent>
        </Card>
      )}

      <ActiveTenantsTable />
    </>
  );
}
