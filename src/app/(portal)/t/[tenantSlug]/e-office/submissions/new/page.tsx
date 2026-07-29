import { NewSubmissionPage } from '@/components/feature/e-office/new-submission/new-submission-page';

export default async function Page({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  return <NewSubmissionPage tenantSlug={tenantSlug} />;
}
