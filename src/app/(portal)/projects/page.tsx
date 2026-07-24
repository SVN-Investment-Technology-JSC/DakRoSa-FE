import { FolderKanban } from 'lucide-react';
import { ModulePage } from '@/components/module-page';

export default function ProjectsPage() {
  return <ModulePage eyebrow="Giai đoạn 03 · eOffice" title="Dự án" description="Quản lý dự án đầu tư, sửa chữa hoặc nâng cấp theo tiến độ và hồ sơ." icon={FolderKanban} features={['Dự án, đầu việc, mốc tiến độ và người phụ trách', 'Theo dõi trạng thái và hồ sơ dự án', 'Quản lý nhà thầu, các mốc nghiệm thu', 'Theo dõi thanh quyết toán theo giai đoạn ở mức hồ sơ']} />;
}
