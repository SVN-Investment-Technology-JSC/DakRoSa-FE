import { SubmissionDetailPage } from '@/components/feature/e-office/submission-detail/submission-detail-page';

export default async function Page({ params }: { params: Promise<{ tenantSlug: string; id: string }> }) {
  const { tenantSlug, id } = await params;
  return <SubmissionDetailPage tenantSlug={tenantSlug} submissionId={id} />;
}
