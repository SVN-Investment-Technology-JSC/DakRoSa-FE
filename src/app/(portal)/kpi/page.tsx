import { ChartNoAxesCombined } from 'lucide-react';
import { ModulePage } from '@/components/module-page';

export default function KpiPage() {
  return <ModulePage eyebrow="Giai đoạn 03 · eOffice" title="KPI" description="Thiết lập và theo dõi chỉ tiêu cơ bản cho cá nhân và phòng ban." icon={ChartNoAxesCombined} features={['Thiết lập chỉ tiêu và kỳ đánh giá', 'Theo dõi kết quả theo cá nhân hoặc phòng ban', 'Khai thác dữ liệu đã được phê duyệt', 'Tổng hợp KPI trên dashboard điều hành']} />;
}
