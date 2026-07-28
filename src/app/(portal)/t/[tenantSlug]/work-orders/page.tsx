'use client';

import { ClipboardList, Edit2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Protected } from '@/components/protected';
import { PERMISSIONS } from '@/lib/navigation';
import { workOrderApi } from '@/lib/api-work-order';
import { WorkOrder } from '@/types/work-order';
import { Modal } from '@/components/ui/modal';
import { hasPermission } from '@/lib/permissions';
import { useAuth } from '@/providers/auth-provider';

export default function WorkOrderPage() {
  const params = useParams();
  const { user } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  
  const [dialog, setDialog] = useState<'create' | 'edit' | null>(null);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'INCIDENT' as 'INCIDENT' | 'MAINTENANCE',
    priority: 'NORMAL' as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
    status: 'DRAFT' as 'DRAFT' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED',
    downtimeMinutes: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await workOrderApi.getAll();
      setWorkOrders(data);
    } catch {
      setNotice({ tone: 'error', message: 'Lỗi tải danh sách phiếu công việc' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const handleOpenCreate = () => {
    setForm({ title: '', description: '', type: 'INCIDENT', priority: 'NORMAL', status: 'DRAFT', downtimeMinutes: 0 });
    setDialog('create');
  };

  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;

  const handleOpenEdit = (wo: WorkOrder) => {
    router.push(`/t/${tenantSlug}/work-orders/${wo.id}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      if (dialog === 'create') {
        await workOrderApi.create({
          code: `WO-${Date.now()}`,
          title: form.title,
          description: form.description || undefined,
          type: form.type as any,
          priority: form.priority as any,
        });
        setNotice({ tone: 'success', message: 'Tạo phiếu công việc thành công.' });
      } else if (dialog === 'edit' && selectedWO) {
        await workOrderApi.update(selectedWO.id, {
          title: form.title,
          description: form.description || undefined,
          type: form.type,
          priority: form.priority,
          status: form.status,
          downtimeMinutes: form.downtimeMinutes,
        });
        setNotice({ tone: 'success', message: 'Cập nhật phiếu công việc thành công.' });
      }
      setDialog(null);
      load();
    } catch (err) { const error = err as Error;
      setNotice({ tone: 'error', message: error.message || 'Lỗi lưu phiếu công việc.' });
    } finally {
      setSaving(false);
    }
  };

  const canEdit = hasPermission(user, PERMISSIONS.WORK_ORDER_UPDATE);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      case 'ASSIGNED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'COMPLETED': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'CLOSED': return 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Protected permission={PERMISSIONS.WORK_ORDER_VIEW}>
      <div className="flex h-full flex-col">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="metric-icon !w-10 !h-10 !rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400 flex items-center justify-center">
                <ClipboardList size={20} />
              </span>
              Phiếu công việc
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Tiếp nhận sự cố, phân công nhân sự và theo dõi tiến độ.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Protected permission={PERMISSIONS.WORK_ORDER_CREATE}>
              <button className="button button-primary" onClick={handleOpenCreate}>
                <Plus size={16} className="mr-2" /> Tạo phiếu mới
              </button>
            </Protected>
          </div>
        </header>

        {notice && (
          <div
            className={`mb-4 flex items-center gap-2 rounded-lg p-4 text-sm ${
              notice.tone === 'error'
                ? 'bg-red-50 text-red-600 dark:bg-red-900/50 dark:text-red-400'
                : 'bg-teal-50 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400'
            }`}
          >
            {notice.tone === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            {notice.message}
          </div>
        )}

        <div className="card flex-1 p-0 overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50/50 text-gray-500 dark:border-gray-800 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Mã phiếu</th>
                  <th className="px-6 py-4 font-medium">Tiêu đề</th>
                  <th className="px-6 py-4 font-medium">Loại</th>
                  <th className="px-6 py-4 font-medium">Độ ưu tiên</th>
                  <th className="px-6 py-4 font-medium">Trạng thái</th>
                  <th className="px-6 py-4 font-medium">Ngày tạo</th>
                  <th className="px-6 py-4 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {loading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-500">Đang tải dữ liệu...</td></tr>
                ) : workOrders.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-500">Chưa có phiếu công việc.</td></tr>
                ) : (
                  workOrders.map((wo) => (
                    <tr key={wo.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 font-medium">{wo.code}</td>
                      <td className="px-6 py-4">{wo.title}</td>
                      <td className="px-6 py-4">
                        {wo.type === 'INCIDENT' ? <span className="text-red-600 font-medium">Sự cố</span> : <span className="text-blue-600 font-medium">Bảo trì</span>}
                      </td>
                      <td className="px-6 py-4">{wo.priority}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(wo.status)}`}>
                          {wo.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">{new Date(wo.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        {canEdit && (
                          <button className="icon-button ml-auto" onClick={() => handleOpenEdit(wo)} title="Cập nhật">
                            <Edit2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        open={!!dialog}
        onClose={() => !saving && setDialog(null)}
        title={dialog === 'create' ? 'Tạo phiếu công việc' : 'Cập nhật phiếu'}
        icon={<span className={dialog === 'create' ? "modal-icon-create" : "modal-icon-edit"}><ClipboardList size={20} /></span>}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tiêu đề *</label>
            <input type="text" required className="form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Loại phiếu</label>
              <select className="form-control" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as never })}>
                <option value="INCIDENT">Sự cố (INCIDENT)</option>
                <option value="MAINTENANCE">Bảo trì (MAINTENANCE)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Độ ưu tiên</label>
              <select className="form-control" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as never })}>
                <option value="LOW">Thấp (LOW)</option>
                <option value="NORMAL">Bình thường (NORMAL)</option>
                <option value="HIGH">Cao (HIGH)</option>
                <option value="URGENT">Khẩn cấp (URGENT)</option>
              </select>
            </div>
          </div>

          {dialog === 'edit' && (
            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-800 pt-4 mt-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Trạng thái</label>
                <select className="form-control" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as never })}>
                  <option value="DRAFT">Nháp (DRAFT)</option>
                  <option value="ASSIGNED">Đã phân công (ASSIGNED)</option>
                  <option value="IN_PROGRESS">Đang xử lý (IN_PROGRESS)</option>
                  <option value="COMPLETED">Hoàn thành (COMPLETED)</option>
                  <option value="CLOSED">Đóng (CLOSED)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Thời gian dừng máy (phút)</label>
                <input type="number" min="0" className="form-control" value={form.downtimeMinutes} onChange={(e) => setForm({ ...form, downtimeMinutes: Number(e.target.value) })} />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Mô tả</label>
            <textarea className="form-control min-h-[80px] resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button type="button" className="button button-secondary" onClick={() => setDialog(null)} disabled={saving}>Hủy</button>
            <button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thông tin'}</button>
          </div>
        </form>
      </Modal>
    </Protected>
  );
}
