import { PageHeading } from '@/components/page-heading';
import { WorkflowCanvas } from '@/components/workflow-canvas';

export default function EofficeWorkflowPage() {
  return (
    <>
      <PageHeading
        eyebrow="Giai đoạn 03 · eOffice"
        title="Văn bản & quy trình"
        description="Thiết kế luồng tiếp nhận, phê duyệt, ký số và phát hành hồ sơ bằng các khối kéo-thả."
      />
      <WorkflowCanvas />
    </>
  );
}
