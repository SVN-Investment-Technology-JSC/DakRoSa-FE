import { MaintenanceCalendarPage } from '@/components/feature/tenant/maintenance/calendar-page';

export default async function Page({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  return <MaintenanceCalendarPage tenantSlug={tenantSlug} />;
}
