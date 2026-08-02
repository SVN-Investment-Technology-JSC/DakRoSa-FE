import { MaintenancePage } from '@/components/feature/tenant/maintenance/maintenance-page';

export default async function Page({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  return <MaintenancePage tenantSlug={tenantSlug} />;
}
