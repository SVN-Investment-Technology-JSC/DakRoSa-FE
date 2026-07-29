import { SignaturesPage } from '@/components/feature/tenant/signatures/signatures-page';

export default async function Page({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  return <SignaturesPage tenantSlug={tenantSlug} />;
}
