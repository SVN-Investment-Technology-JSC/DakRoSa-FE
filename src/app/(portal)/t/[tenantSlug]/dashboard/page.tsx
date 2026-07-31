import { TenantDashboardPage } from '@/components/feature/tenant/dashboard/tenant-dashboard-page';

export default async function Page({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  return <TenantDashboardPage tenantSlug={tenantSlug} />;
}
