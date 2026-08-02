import { MaintenanceCalendarPage } from '@/components/feature/tenant/maintenance/calendar-page';

export const dynamic = 'force-dynamic';

export default async function Page({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  return <MaintenanceCalendarPage tenantSlug={tenantSlug} />;
}
