import { PackageSearch } from 'lucide-react';
import { ModulePage } from '@/components/module-page';

export default function InventoryPage() {
  return <ModulePage eyebrow="Giai đoạn 02 · Vận hành" title="Kho vật tư" description="Quản lý vật tư và phụ tùng liên kết với thiết bị, sự cố và công việc." icon={PackageSearch} features={['Danh mục vật tư, đơn vị tính, nhà cung cấp và vị trí kho', 'Nhập, xuất, điều chuyển, tồn kho và lịch sử giao dịch', 'Định mức tồn tối thiểu và cảnh báo thiếu vật tư', 'Báo cáo tiêu hao và lịch sử sử dụng theo thiết bị']} />;
}
