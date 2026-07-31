import { InventoryPage } from '@/components/feature/tenant/inventory/inventory-page';

export default async function Page({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  return <InventoryPage tenantSlug={tenantSlug} />;
}
