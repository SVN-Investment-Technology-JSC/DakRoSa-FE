import { ClipboardList } from 'lucide-react';
import { ModulePage } from '@/components/module-page';

export default function MaintenancePage() {
  return <ModulePage eyebrow="Giai đoạn 02 · Vận hành" title="Bảo trì & công việc" description="Lập kế hoạch, xử lý sự cố và theo dõi tiến độ công việc kỹ thuật." icon={ClipboardList} features={['Tạo phiếu sự cố và phân loại mức độ', 'Phân công, xử lý, kiểm tra và đóng phiếu', 'Kế hoạch bảo trì định kỳ và nhắc lịch', 'Theo dõi thời gian dừng, quá hạn và tình trạng thực hiện']} />;
}
