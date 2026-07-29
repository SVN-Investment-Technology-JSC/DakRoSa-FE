import { PlatformTenantConfigurationPage } from '@/components/feature/platform/tenant-configuration/platform-tenant-configuration-page';

export default async function Page({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  return <PlatformTenantConfigurationPage tenantId={tenantId} />;
}
