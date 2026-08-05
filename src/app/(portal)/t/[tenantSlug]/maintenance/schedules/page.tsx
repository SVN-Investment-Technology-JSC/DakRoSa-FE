import { SchedulesPage } from '@/components/feature/tenant/maintenance/schedules-page';

export const dynamic = 'force-dynamic';

export default async function Page({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  return <SchedulesPage tenantSlug={tenantSlug} />;
}
