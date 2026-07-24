import { BadgeCheck, BriefcaseBusiness, FileText, FolderKanban, UsersRound } from 'lucide-react';
import { PageHeading } from '@/components/page-heading';

const modules = [
  {
    title: 'E-Office & quy trình số',
    description: 'Tiếp nhận, luân chuyển, phê duyệt, phát hành và lưu trữ hồ sơ nội bộ.',
    icon: FileText,
    features: [
      'Văn bản đến, đi và văn bản nội bộ',
      'Tờ trình, đề xuất và hồ sơ phê duyệt',
      'Workflow, ủy quyền, nhắc hạn và lịch sử xử lý',
      'Lưu trữ, quản lý phiên bản, tra cứu và nhật ký',
      'Giao diện tích hợp chữ ký số theo phương án được phê duyệt',
    ],
  },
  {
    title: 'HRM & chấm công',
    description: 'Quản lý tổ chức, nhân sự, hồ sơ công tác và ca kíp trên nền tảng dùng chung.',
    icon: UsersRound,
    features: [
      'Cơ cấu tổ chức, chức danh, vị trí và ủy quyền',
      'Hồ sơ nhân sự, hợp đồng, điều động và tài liệu liên quan',
      'Đào tạo, chứng chỉ chuyên môn/an toàn và nghỉ phép',
      'Lịch ca trực, chấm công, làm thêm giờ và bảng công',
      'Dashboard và báo cáo nhân sự cơ bản',
    ],
  },
  {
    title: 'Workspace, KPI & dự án',
    description: 'Điều hành công việc và kế hoạch tập trung, theo dõi kết quả và tiến độ dự án.',
    icon: FolderKanban,
    features: [
      'Giao việc, phối hợp, trao đổi và đính kèm hồ sơ',
      'Kế hoạch cá nhân, phòng ban và vận hành theo kỳ',
      'Theo dõi tiến độ, mốc thời gian, quá hạn và nhắc việc',
      'KPI cơ bản cho cá nhân/phòng ban theo kỳ đánh giá',
      'Dự án, nhà thầu, nghiệm thu và hồ sơ theo giai đoạn',
    ],
  },
];

export default function EofficePage() {
  return (
    <>
      <PageHeading
        eyebrow="Giai đoạn 03 · Quản trị doanh nghiệp"
        title="eOffice"
        description="Không gian làm việc số cho văn bản, nhân sự, công việc, kế hoạch và dự án; dùng chung tài khoản, phân quyền và hạ tầng Core Portal."
      />
      <section className="metrics-grid" aria-label="Phạm vi giai đoạn 3">
        <article className="metric-card"><div className="metric-top"><span className="metric-icon"><FileText size={19} /></span><span className="metric-tag">E-Office</span></div><strong>Văn bản số</strong><p>Tiếp nhận, phê duyệt, phát hành và lưu trữ</p></article>
        <article className="metric-card"><div className="metric-top"><span className="metric-icon"><UsersRound size={19} /></span><span className="metric-tag">HRM</span></div><strong>Nhân sự</strong><p>Hồ sơ, đào tạo, chứng chỉ và ca kíp</p></article>
        <article className="metric-card"><div className="metric-top"><span className="metric-icon"><BriefcaseBusiness size={19} /></span><span className="metric-tag">Workspace</span></div><strong>Công việc</strong><p>Kế hoạch, tiến độ, nhắc hạn và KPI</p></article>
        <article className="metric-card"><div className="metric-top"><span className="metric-icon"><FolderKanban size={19} /></span><span className="metric-tag">Project</span></div><strong>Dự án</strong><p>Mốc tiến độ, nhà thầu và nghiệm thu</p></article>
      </section>
      <section className="feature-grid" aria-label="Các phân hệ eOffice">
        {modules.map(({ title, description, icon: Icon, features }) => (
          <article className="panel feature-card" key={title}>
            <span className="metric-icon"><Icon size={20} /></span>
            <h2>{title}</h2>
            <p>{description}</p>
            <ul className="feature-list">
              {features.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
          </article>
        ))}
      </section>
      <section className="panel phase-card" style={{ marginTop: 20 }}>
        <BadgeCheck size={23} color="#45cec2" style={{ marginBottom: 18 }} />
        <h2>Quy trình số trên một nền tảng thống nhất</h2>
        <p>Các phân hệ sử dụng chung tài khoản và RBAC. Việc tích hợp chữ ký số được thực hiện theo phương án phê duyệt; không bao gồm chi phí chứng thư, license hoặc phí ký của nhà cung cấp.</p>
      </section>
    </>
  );
}
