import { BriefcaseBusiness } from 'lucide-react';
import { ModulePage } from '@/components/module-page';

export default function WorkspacePage() {
  return <ModulePage eyebrow="Giai đoạn 03 · eOffice" title="Không gian công việc" description="Điều hành công việc và kế hoạch tập trung cho cá nhân, phòng ban và nhà máy." icon={BriefcaseBusiness} features={['Giao việc, phối hợp, trao đổi và đính kèm hồ sơ', 'Kế hoạch tuần, tháng, năm theo cá nhân và phòng ban', 'Theo dõi tiến độ, mốc thời gian, quá hạn và nhắc việc', 'Dashboard tổng hợp công việc và kế hoạch thực hiện']} />;
}
