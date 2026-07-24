import { RadioTower } from 'lucide-react';
import { ModulePage } from '@/components/module-page';

export default function OccPage() {
  return <ModulePage eyebrow="Giai đoạn 02 · Vận hành" title="Liên kết OCC" description="Khai thác cảnh báo và dữ liệu bất thường để khởi tạo xử lý kỹ thuật." icon={RadioTower} features={['Liên kết cảnh báo OCC với thiết bị liên quan', 'Tạo phiếu xử lý kỹ thuật từ sự kiện bất thường', 'Theo dõi trạng thái xử lý và lịch sử can thiệp', 'Chỉ tiếp nhận dữ liệu, không điều khiển SCADA/OT']} />;
}
