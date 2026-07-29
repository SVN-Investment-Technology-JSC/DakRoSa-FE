'use client';

import { CalendarClock, Edit2, Trash2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Protected } from '@/components/protected';
import { PERMISSIONS } from '@/lib/navigation';
import { maintenanceApi } from '@/lib/api-maintenance';
import { equipmentApi } from '@/lib/api-equipment';
import { MaintenancePlan } from '@/types/maintenance';
import { Equipment } from '@/types/equipment';
import { Modal } from '@/components/ui/modal';
import { hasPermission } from '@/lib/permissions';
import { useAuth } from '@/providers/auth-provider';

export function MaintenancePage({ tenantSlug }: { tenantSlug: string }) {
  const { user } = useAuth();
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  
  const [dialog, setDialog] = useState<'create' | 'edit' | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<MaintenancePlan | null>(null);
  
  const [form, setForm] = useState({
    equipmentId: '',
    title: '',
    description: '',
    frequencyDays: 30,
    nextDueDate: '',
    isActive: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [plansData, equipData] = await Promise.all([
        maintenanceApi.getAll(),
        equipmentApi.getAll()
      ]);
      setPlans(plansData);
      setEquipments(equipData);
    } catch {
      setNotice({ tone: 'error', message: 'Lỗi tải danh sách kế hoạch bảo trì' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, tenantSlug]);

  const handleOpenCreate = () => {
    setForm({ equipmentId: equipments[0]?.id || '', title: '', description: '', frequencyDays: 30, nextDueDate: '', isActive: true });
    setDialog('create');
  };

  const handleOpenEdit = (plan: MaintenancePlan) => {
    setSelectedPlan(plan);
    setForm({
      equipmentId: plan.equipmentId,
      title: plan.title,
      description: plan.description || '',
      frequencyDays: plan.frequencyDays || 30,
      nextDueDate: plan.nextDueDate ? plan.nextDueDate.split('T')[0] : '',
      isActive: plan.isActive,
    });
    setDialog('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      if (!form.equipmentId) throw new Error('Vui lòng chọn thiết bị.');
      const payload = {
        equipmentId: form.equipmentId,
        title: form.title,
        description: form.description || undefined,
        frequencyDays: Number(form.frequencyDays) || undefined,
        nextDueDate: form.nextDueDate || undefined,
      };

      if (dialog === 'create') {
        await maintenanceApi.create(payload);
        setNotice({ tone: 'success', message: 'Tạo kế hoạch bảo trì thành công.' });
      } else if (dialog === 'edit' && selectedPlan) {
        await maintenanceApi.update(selectedPlan.id, { ...payload, isActive: form.isActive });
        setNotice({ tone: 'success', message: 'Cập nhật kế hoạch bảo trì thành công.' });
      }
      setDialog(null);
      load();
    } catch (err) { const error = err as Error;
      setNotice({ tone: 'error', message: error.message || 'Lỗi lưu kế hoạch bảo trì.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa kế hoạch này?')) return;
    try {
      await maintenanceApi.delete(id);
      setNotice({ tone: 'success', message: 'Xóa kế hoạch thành công.' });
      load();
    } catch (err) { const error = err as Error;
      setNotice({ tone: 'error', message: error.message || 'Lỗi khi xóa kế hoạch.' });
    }
  };

  const canEdit = hasPermission(user, PERMISSIONS.MAINTENANCE_UPDATE);
  const canDelete = hasPermission(user, PERMISSIONS.MAINTENANCE_DELETE);

  return (
    <Protected permission={PERMISSIONS.MAINTENANCE_VIEW}>
      <div className="flex h-full flex-col">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="metric-icon !w-10 !h-10 !rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400 flex items-center justify-center">
                <CalendarClock size={20} />
              </span>
              Bảo trì định kỳ
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Quản lý lịch trình bảo dưỡng và thay thế linh kiện định kỳ.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Protected permission={PERMISSIONS.MAINTENANCE_CREATE}>
              <button className="button button-primary" onClick={handleOpenCreate}>
                <Plus size={16} className="mr-2" /> Lập kế hoạch
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
                  <th className="px-6 py-4 font-medium">Tiêu đề</th>
                  <th className="px-6 py-4 font-medium">Thiết bị</th>
                  <th className="px-6 py-4 font-medium">Chu kỳ (ngày)</th>
                  <th className="px-6 py-4 font-medium">Ngày đến hạn tới</th>
                  <th className="px-6 py-4 font-medium">Trạng thái</th>
                  <th className="px-6 py-4 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">Đang tải dữ liệu...</td></tr>
                ) : plans.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">Chưa có kế hoạch bảo trì nào.</td></tr>
                ) : (
                  plans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 font-medium">{plan.title}</td>
                      <td className="px-6 py-4">
                        {equipments.find(e => e.id === plan.equipmentId)?.name || 'Thiết bị không tồn tại'}
                      </td>
                      <td className="px-6 py-4">{plan.frequencyDays || '—'}</td>
                      <td className="px-6 py-4">{plan.nextDueDate ? plan.nextDueDate.split('T')[0] : '—'}</td>
                      <td className="px-6 py-4">
                        {plan.isActive ? (
                          <span className="text-green-600 font-medium">Kích hoạt</span>
                        ) : (
                          <span className="text-gray-500">Đã dừng</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canEdit && (
                            <button className="icon-button" onClick={() => handleOpenEdit(plan)} title="Cập nhật">
                              <Edit2 size={16} />
                            </button>
                          )}
                          {canDelete && (
                            <button className="icon-button text-red-600 hover:text-red-700 hover:border-red-200" onClick={() => handleDelete(plan.id)} title="Xóa">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
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
        title={dialog === 'create' ? 'Tạo kế hoạch bảo trì' : 'Cập nhật kế hoạch'}
        icon={<span className={dialog === 'create' ? "modal-icon-create" : "modal-icon-edit"}><CalendarClock size={20} /></span>}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tiêu đề kế hoạch *</label>
            <input type="text" required className="form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Chọn thiết bị *</label>
            <select required className="form-control" value={form.equipmentId} onChange={(e) => setForm({ ...form, equipmentId: e.target.value })}>
              <option value="">-- Chọn thiết bị --</option>
              {equipments.map(e => (
                <option key={e.id} value={e.id}>{e.code} - {e.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Chu kỳ bảo trì (ngày)</label>
              <input type="number" min="1" className="form-control" value={form.frequencyDays} onChange={(e) => setForm({ ...form, frequencyDays: Number(e.target.value) })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Ngày bảo trì tiếp theo</label>
              <input type="date" className="form-control" value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} />
            </div>
          </div>

          {dialog === 'edit' && (
             <div className="flex items-center mt-4">
               <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                 <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                 Đang kích hoạt
               </label>
             </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Mô tả công việc (hướng dẫn)</label>
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
