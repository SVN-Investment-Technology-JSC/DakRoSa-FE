import { WorkItemsPage } from '@/components/feature/tenant/work-items/work-items-page';

export default async function Page({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  return <WorkItemsPage tenantSlug={tenantSlug} />;
}
