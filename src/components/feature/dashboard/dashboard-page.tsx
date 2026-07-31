'use client';

import { Activity, Database, ScrollText, ShieldCheck, Users, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeading } from '@/components/page-heading';
import { ApiError } from '@/services/service-error';
import { dashboardService } from '@/services/dashboard.service';
import type { DashboardSummary } from '@/types/dashboard';

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void dashboardService.getSummary()
      .then(setSummary)
      .catch((requestError) =>
        setError(requestError instanceof ApiError ? requestError.message : 'Không thể tải dữ liệu tổng quan.'),
      );
  }, []);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const metrics = [
    { label: 'Tài khoản hệ thống', value: summary?.users ?? '—', note: `${summary?.activeUsers ?? 0} đang hoạt động`, icon: Users },
    { label: 'Vai trò nghiệp vụ', value: summary?.roles ?? '—', note: 'Phân quyền động theo permission', icon: ShieldCheck },
    { label: 'Sự kiện hôm nay', value: summary?.eventsToday ?? '—', note: 'Dấu vết thao tác quản trị', icon: ScrollText },
    { label: 'Collector dữ liệu', value: 'PoC', note: summary?.collector.label ?? 'Đang chờ cấu hình', icon: Database },
  ];

  return (
    <>
      <PageHeading
        eyebrow="Giai đoạn 01 · Core Portal"
        title="Tổng quan vận hành"
        description="Nền móng quản trị tập trung đã sẵn sàng. Các chỉ số SCADA, hồ chứa và sản lượng sẽ được kết nối sau khi hoàn tất PoC Collector."
      />
      <section className="metrics-grid" aria-label="Chỉ số tổng quan">
        {metrics.map(({ label, value, note, icon: Icon }) => (
          <article className="metric-card" key={label}>
            <div className="metric-top">
              <span className="metric-icon"><Icon size={19} /></span>
              <span className="metric-tag">Realtime</span>
            </div>
            <strong>{value}</strong>
            <p>{label} · {note}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="section-heading">
            <div><h2>Tình trạng nền tảng</h2><p>Các lớp kỹ thuật của Core Portal</p></div>
            <Wifi size={18} color="#0c8f89" />
          </div>
          <div className="system-track">
            <div className="system-row">
              <div><strong>Identity & Access</strong><p>JWT ngắn hạn · refresh rotation</p></div>
              <div className="system-line"><span style={{ width: '100%' }} /></div>
              <span className="system-state">Sẵn sàng</span>
            </div>
            <div className="system-row">
              <div><strong>RBAC Permission</strong><p>Vai trò động · backend authoritative</p></div>
              <div className="system-line"><span style={{ width: '100%' }} /></div>
              <span className="system-state">Sẵn sàng</span>
            </div>
            <div className="system-row">
              <div><strong>Collector SCADA</strong><p>Read-only · store-and-forward</p></div>
              <div className="system-line"><span style={{ width: '18%', background: '#f2a93b' }} /></div>
              <span className="system-state" style={{ color: '#aa7627' }}>Chờ PoC</span>
            </div>
          </div>
        </article>
        <article className="panel phase-card">
          <Activity size={23} color="#45cec2" style={{ marginBottom: 18 }} />
          <h2>Nền tảng cho nhà máy số</h2>
          <p>Giai đoạn đầu ưu tiên một lõi bảo mật và dễ bảo trì để các phân hệ dữ liệu vận hành được nối vào mà không phải làm lại hệ thống.</p>
          <div className="phase-list">
            <div className="phase-item"><i>✓</i> Đăng nhập và quản lý phiên</div>
            <div className="phase-item"><i>✓</i> Người dùng, vai trò, permission</div>
            <div className="phase-item"><i>✓</i> Nhật ký thao tác quản trị</div>
          </div>
        </article>
      </section>
    </>
  );
}
