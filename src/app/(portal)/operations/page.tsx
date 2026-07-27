import { Boxes, ClipboardList, Database, PackageSearch, Wrench } from 'lucide-react';
import { PageHeading } from '@/components/page-heading';

const modules = [
  {
    title: 'EAM / CMMS',
    description: 'Quản lý kỹ thuật, thiết bị và bảo trì trên nền tảng dùng chung của Core Portal.',
    icon: Wrench,
    features: [
      'Danh mục, cây thiết bị và mã hóa phân cấp',
      'Lý lịch thiết bị, hồ sơ kỹ thuật và lịch sử sửa chữa',
      'Sự cố, phiếu công việc, phân công và đóng phiếu',
      'Kế hoạch bảo trì định kỳ, nhắc lịch và theo dõi thực hiện',
      'Báo cáo bảo trì, thời gian dừng và công việc quá hạn',
    ],
  },
  {
    title: 'Kho vật tư & phụ tùng',
    description: 'Quản lý vật tư dùng cho thiết bị, sự cố và các công việc bảo trì.',
    icon: PackageSearch,
    features: [
      'Danh mục vật tư, phụ tùng, nhà cung cấp và vị trí lưu kho',
      'Nghiệp vụ nhập, xuất, điều chuyển, tồn kho và lịch sử giao dịch',
      'Định mức tồn tối thiểu và cảnh báo thiếu vật tư',
      'Theo dõi vật tư theo thiết bị, sự cố và phiếu công việc',
      'Báo cáo nhập - xuất - tồn và vật tư tiêu hao',
    ],
  },
];

export default function OperationsPage() {
  return (
    <>
      <PageHeading
        eyebrow="Giai đoạn 02 · Kỹ thuật & bảo trì"
        title="Vận hành"
        description="Quản lý vòng đời thiết bị, sự cố, bảo trì và vật tư; liên kết dữ liệu vận hành OCC để xử lý kỹ thuật kịp thời."
      />
      <section className="metrics-grid" aria-label="Phạm vi giai đoạn 2">
        <article className="metric-card"><div className="metric-top"><span className="metric-icon"><Boxes size={19} /></span><span className="metric-tag">EAM / CMMS</span></div><strong>Thiết bị</strong><p>Cây thiết bị, lý lịch và hồ sơ kỹ thuật</p></article>
        <article className="metric-card"><div className="metric-top"><span className="metric-icon"><ClipboardList size={19} /></span><span className="metric-tag">Bảo trì</span></div><strong>Công việc</strong><p>Sự cố, phân công, kế hoạch và nhắc lịch</p></article>
        <article className="metric-card"><div className="metric-top"><span className="metric-icon"><PackageSearch size={19} /></span><span className="metric-tag">Inventory</span></div><strong>Vật tư</strong><p>Nhập - xuất - tồn và định mức dự phòng</p></article>
        <article className="metric-card"><div className="metric-top"><span className="metric-icon"><Database size={19} /></span><span className="metric-tag">OCC</span></div><strong>Liên kết dữ liệu</strong><p>Tạo phiếu kỹ thuật từ cảnh báo bất thường</p></article>
      </section>
      <section className="feature-grid" aria-label="Các phân hệ vận hành">
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
        <Database size={23} color="#45cec2" style={{ marginBottom: 18 }} />
        <h2>Liên kết dữ liệu vận hành OCC</h2>
        <p>Từ cảnh báo hoặc dữ liệu bất thường trên OCC, người dùng có thể liên kết thiết bị và tạo phiếu xử lý kỹ thuật. Phân hệ không kết nối điều khiển hoặc thay đổi cấu hình SCADA/OT.</p>
      </section>
    </>
  );
}
