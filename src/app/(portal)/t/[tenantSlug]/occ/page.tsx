import { RadioTower } from 'lucide-react';
import { ModulePage } from '@/components/module-page';

export default async function Page({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;

  return (
    <ModulePage
      eyebrow="Vận hành · OCC"
      title="Liên kết OCC"
      description={`Theo dõi và xử lý cảnh báo vận hành thuộc doanh nghiệp ${tenantSlug}. Dữ liệu OCC được giới hạn theo không gian doanh nghiệp đang chọn.`}
      icon={RadioTower}
      features={[
        'Tiếp nhận cảnh báo và sự kiện vận hành theo doanh nghiệp',
        'Liên kết cảnh báo với thiết bị, vật tư và phiếu công việc',
        'Theo dõi trạng thái xử lý mà không can thiệp SCADA/OT',
      ]}
    />
  );
}
