import type { LucideIcon } from 'lucide-react';
import { ListChecks } from 'lucide-react';
import { PageHeading } from '@/components/page-heading';

interface ModulePageProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  features: readonly string[];
}

export function ModulePage({ eyebrow, title, description, icon: Icon, features }: ModulePageProps) {
  return (
    <>
      <PageHeading eyebrow={eyebrow} title={title} description={description} />
      <section className="panel feature-card" aria-label={`Chức năng ${title}`}>
        <span className="metric-icon"><Icon size={20} /></span>
        <h2>Chức năng chính</h2>
        <p>Phân hệ được triển khai trên nền tảng Core Portal, sử dụng chung tài khoản và cơ chế phân quyền.</p>
        <ul className="feature-list">
          {features.map((feature) => <li key={feature}>{feature}</li>)}
        </ul>
      </section>
      <section className="panel phase-card" style={{ marginTop: 20 }}>
        <ListChecks size={23} color="#45cec2" style={{ marginBottom: 18 }} />
        <h2>Sẵn sàng cấu hình quy trình</h2>
        <p>Các biểu mẫu, danh mục và luồng xử lý sẽ được cấu hình theo quy trình nghiệp vụ đã thống nhất trong giai đoạn triển khai.</p>
      </section>
    </>
  );
}
