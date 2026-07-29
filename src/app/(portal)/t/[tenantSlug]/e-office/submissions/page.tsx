import { SubmissionsPage } from '@/components/feature/e-office/submissions/submissions-page';

export default async function Page({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  return <SubmissionsPage tenantSlug={tenantSlug} />;
}
