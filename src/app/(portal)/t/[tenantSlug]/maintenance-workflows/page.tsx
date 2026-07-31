import { WorkflowsPage } from '@/components/feature/tenant/maintenance/workflows-page';

export default async function Page({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  return <WorkflowsPage tenantSlug={tenantSlug} />;
}
