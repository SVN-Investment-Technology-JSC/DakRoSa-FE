import { JobPlansPage } from '@/components/feature/tenant/maintenance/job-plans-page';

export default async function Page({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  return <JobPlansPage tenantSlug={tenantSlug} />;
}
