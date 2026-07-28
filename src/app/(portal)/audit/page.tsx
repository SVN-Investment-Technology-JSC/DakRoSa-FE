'use client';

import { RefreshCw, ScrollText } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeading } from '@/components/page-heading';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/services/service-error';
import { auditService } from '@/services/audit.service';
import type { AuditLog } from '@/types/audit';

const actionLabels: Record<string, string> = {
  login: 'Đăng nhập',
  logout_all: 'Đăng xuất mọi thiết bị',
  change_password: 'Đổi mật khẩu',
  reset_password: 'Đặt lại mật khẩu',
  create: 'Tạo mới',
  update: 'Cập nhật',
  delete: 'Xóa',
  assign_permissions: 'Gán quyền',
};

const auditDateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'medium',
});

export default function AuditPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await auditService.getLogs();
      setItems(result.items);
      setTotal(result.total);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Không thể tải nhật ký.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    auditService.getLogs()
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setTotal(result.total);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError instanceof ApiError ? requestError.message : 'Không thể tải nhật ký.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  return (
    <>
      <PageHeading
        eyebrow="Audit trail"
        title="Nhật ký hệ thống"
        description="Theo dõi thay đổi quản trị mà không lưu mật khẩu, access token, refresh token hay nội dung Authorization."
        actions={<Button variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Làm mới</Button>}
      />
      <section className="panel data-panel">
        {loading ? (
          <div className="empty-state"><ScrollText size={38} /><strong>Đang tải nhật ký…</strong></div>
        ) : items.length === 0 ? (
          <div className="empty-state"><ScrollText size={38} /><strong>Chưa có sự kiện</strong><p>Các thao tác quản trị và đăng nhập sẽ xuất hiện tại đây.</p></div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Hành động</th><th>Đối tượng</th><th>Trạng thái</th><th>Địa chỉ IP</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td><span className="cell-main">{auditDateTimeFormatter.format(new Date(item.createdAt))}</span></td>
                  <td><span className="cell-main">{item.username ?? 'Ẩn danh'}</span>{item.userId && <span className="cell-sub">ID {item.userId.slice(0, 8)}…</span>}</td>
                  <td>{actionLabels[item.action] ?? item.action}</td>
                  <td><span className="cell-main">{item.resource}</span>{item.resourceId && <span className="cell-sub">{item.resourceId.slice(0, 12)}…</span>}</td>
                  <td><span className={`status-badge ${item.status === 'success' ? 'status-active' : 'status-inactive'}`}>{item.status === 'success' ? 'Thành công' : 'Thất bại'}</span></td>
                  <td>{item.ipAddress ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="pagination-bar"><span>{total} sự kiện</span><span>50 sự kiện mới nhất</span></div>
      </section>
    </>
  );
}
