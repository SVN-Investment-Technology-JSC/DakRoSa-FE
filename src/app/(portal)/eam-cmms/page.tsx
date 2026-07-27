import { Wrench } from 'lucide-react';
import { ModulePage } from '@/components/module-page';

export default function EamCmmsPage() {
  return <ModulePage eyebrow="Giai đoạn 02 · Vận hành" title="EAM / CMMS" description="Nền tảng quản lý kỹ thuật, thiết bị, sự cố và bảo trì." icon={Wrench} features={['Quản lý vòng đời và cấu trúc thiết bị', 'Hồ sơ kỹ thuật, lịch sử vận hành và sửa chữa', 'Phiếu sự cố, phân công xử lý và nghiệm thu', 'Kế hoạch bảo trì theo thời gian, giờ vận hành hoặc điều kiện']} />;
}
