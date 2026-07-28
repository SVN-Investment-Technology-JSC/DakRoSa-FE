'use client';

import { ArrowLeft, Building2, Save } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeading } from '@/components/page-heading';
import { TenantBrandingSettings } from '@/components/platform/tenant-branding-settings';
import { TenantConfigNavigation } from '@/components/platform/tenant-config-navigation';
import { TenantConfigOverview } from '@/components/platform/tenant-config-overview';
import { TenantDangerZone } from '@/components/platform/tenant-danger-zone';
import { TenantGeneralSettings } from '@/components/platform/tenant-general-settings';
import { TenantModuleSettings } from '@/components/platform/tenant-module-settings';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { platformTenantsService } from '@/services/platform-tenants.service';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  archivePlatformTenant,
  fetchActiveTenants,
  tenantUpserted,
  updatePlatformTenant,
} from '@/store/platform-tenants.slice';

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function TenantConfigurationSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-6 xl:grid-cols-[240px_1fr]">
        <Skeleton className="h-64 w-full" />
        <div className="grid gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function PlatformTenantConfigurationPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { active, activeStatus } = useAppSelector(
    (state) => state.platformTenants,
  );
  const tenant = active.find((item) => item.id === tenantId);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  useEffect(() => {
    void dispatch(fetchActiveTenants({}));
  }, [dispatch]);

  useEffect(() => {
    if (!tenant) return;
    setEnabledModules(
      tenant.enabledModules.filter((module) => module !== 'core'),
    );
    setRemoveLogo(false);
  }, [tenant]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tenant || isSaving) return;

    const form = new FormData(event.currentTarget);
    const logo = form.get('logo');
    const logoFile = logo instanceof File && logo.size > 0 ? logo : null;

    setIsSaving(true);
    try {
      await dispatch(
        updatePlatformTenant({
          id: tenant.id,
          input: {
            name: String(form.get('name') ?? ''),
            shortName: String(form.get('shortName') ?? ''),
            primaryColor: String(form.get('primaryColor') ?? ''),
            locale: String(form.get('locale') ?? ''),
            timezone: String(form.get('timezone') ?? ''),
            enabledModules: ['core', ...enabledModules],
          },
        }),
      ).unwrap();

      if (logoFile) {
        const brandedTenant = await platformTenantsService.uploadLogo(
          tenant.id,
          logoFile,
        );
        dispatch(tenantUpserted(brandedTenant));
      } else if (removeLogo && tenant.logoUrl) {
        const unbrandedTenant = await platformTenantsService.removeLogo(
          tenant.id,
        );
        dispatch(tenantUpserted(unbrandedTenant));
      }

      setRemoveLogo(false);
      toast.success('Đã lưu cấu hình doanh nghiệp.');
    } catch (error) {
      toast.error(errorMessage(error, 'Không thể cập nhật doanh nghiệp.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!tenant || isArchiving) return;
    setIsArchiving(true);
    try {
      await dispatch(archivePlatformTenant(tenant.id)).unwrap();
      toast.success(`Đã lưu trữ doanh nghiệp ${tenant.shortName}.`);
      router.replace('/platform/tenants');
    } catch (error) {
      toast.error(errorMessage(error, 'Không thể lưu trữ doanh nghiệp.'));
      setIsArchiving(false);
    }
  };

  if (activeStatus === 'idle' || activeStatus === 'loading') {
    return <TenantConfigurationSkeleton />;
  }

  if (!tenant) {
    return (
      <Empty className="min-h-[440px] border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Building2 />
          </EmptyMedia>
          <EmptyTitle>Không tìm thấy doanh nghiệp</EmptyTitle>
          <EmptyDescription>
            Doanh nghiệp không tồn tại, đã được lưu trữ hoặc bạn không còn
            quyền truy cập.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/platform/tenants">
              <ArrowLeft />
              Quay lại danh sách
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <>
      <PageHeading
        eyebrow="Tenant configuration"
        title={tenant.name}
        description={`Thiết lập riêng cho ${tenant.shortName}. Cấu trúc trang được chia theo nhóm để có thể mở rộng thêm cấu hình sau này.`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/platform/tenants">
                <ArrowLeft />
                Danh sách doanh nghiệp
              </Link>
            </Button>
            <Button
              type="submit"
              form="tenant-configuration-form"
              disabled={isSaving}
            >
              <Save />
              {isSaving ? 'Đang lưu…' : 'Lưu cấu hình'}
            </Button>
          </>
        }
      />

      <TenantConfigOverview tenant={tenant} />

      <form
        id="tenant-configuration-form"
        className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]"
        onSubmit={handleSave}
      >
        <TenantConfigNavigation />
        <div className="grid min-w-0 gap-6">
          <TenantGeneralSettings tenant={tenant} disabled={isSaving} />
          <TenantBrandingSettings
            tenant={tenant}
            removeLogo={removeLogo}
            onRemoveLogoChange={setRemoveLogo}
            disabled={isSaving}
          />
          <TenantModuleSettings
            enabledModules={enabledModules}
            onChange={setEnabledModules}
            disabled={isSaving}
          />
          <TenantDangerZone
            tenant={tenant}
            isArchiving={isArchiving}
            onArchive={handleArchive}
          />
        </div>
      </form>
    </>
  );
}
