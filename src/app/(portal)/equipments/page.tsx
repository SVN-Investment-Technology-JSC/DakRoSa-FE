import { Boxes } from 'lucide-react';
import { ModulePage } from '@/components/module-page';

export default function EquipmentsPage() {
  return <ModulePage eyebrow="Giai đoạn 02 · Vận hành" title="Thiết bị" description="Danh mục, phân cấp và hồ sơ kỹ thuật tập trung cho thiết bị nhà máy." icon={Boxes} features={['Danh mục nhà máy, hệ thống, cụm và thiết bị', 'Mã hóa, phân cấp thiết bị chính và phụ', 'Thông số kỹ thuật, hình ảnh và tài liệu đính kèm', 'Lịch sử vận hành, sửa chữa và vật tư sử dụng']} />;
}
