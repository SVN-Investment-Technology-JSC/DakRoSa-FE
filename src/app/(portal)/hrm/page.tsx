import { UsersRound } from 'lucide-react';
import { ModulePage } from '@/components/module-page';

export default function HrmPage() {
  return <ModulePage eyebrow="Giai đoạn 03 · eOffice" title="Nhân sự & chấm công" description="Quản lý tổ chức, hồ sơ nhân sự, đào tạo và ca kíp." icon={UsersRound} features={['Phòng ban, chức danh, vị trí công việc và ủy quyền', 'Hồ sơ nhân sự, hợp đồng và quá trình công tác', 'Đào tạo, chứng chỉ chuyên môn/an toàn và nghỉ phép', 'Lịch ca trực, chấm công, làm thêm giờ và bảng công']} />;
}
