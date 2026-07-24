'use client';

import { Settings2, Edit2, Trash2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Protected } from '@/components/protected';
import { PERMISSIONS } from '@/lib/navigation';
import { equipmentApi } from '@/lib/api-equipment';
import { Equipment } from '@/types/equipment';
import { Modal } from '@/components/ui/modal';
import { hasPermission } from '@/lib/permissions';
import { useAuth } from '@/providers/auth-provider';

export default function EquipmentPage() {
  const { user } = useAuth();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  
  const [dialog, setDialog] = useState<'create' | 'edit' | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    category: '',
    status: 'ACTIVE',
    installationDate: '',
    description: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await equipmentApi.getAll();
      setEquipments(data);
    } catch (error: any) {
      setNotice({ tone: 'error', message: error.message || 'Lỗi khi tải danh sách thiết bị' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleOpenCreate = () => {
    setForm({ code: '', name: '', category: '', status: 'ACTIVE', installationDate: '', description: '' });
    setDialog('create');
  };

  const handleOpenEdit = (eq: Equipment) => {
    setSelectedEquipment(eq);
    setForm({
      code: eq.code,
      name: eq.name,
      category: eq.category || '',
      status: eq.status,
      installationDate: eq.installationDate ? eq.installationDate.split('T')[0] : '',
      description: eq.description || '',
    });
    setDialog('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const payload = {
        code: form.code,
        name: form.name,
        category: form.category || undefined,
        status: form.status,
        installationDate: form.installationDate || undefined,
        description: form.description || undefined,
      };

      if (dialog === 'create') {
        await equipmentApi.create(payload);
        setNotice({ tone: 'success', message: 'Thêm thiết bị thành công.' });
      } else if (dialog === 'edit' && selectedEquipment) {
        await equipmentApi.update(selectedEquipment.id, payload);
        setNotice({ tone: 'success', message: 'Cập nhật thiết bị thành công.' });
      }
      setDialog(null);
      load();
    } catch (error: any) {
      setNotice({ tone: 'error', message: error.message || 'Lỗi khi lưu thiết bị.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa thiết bị này?')) return;
    try {
      await equipmentApi.delete(id);
      setNotice({ tone: 'success', message: 'Xóa thiết bị thành công.' });
      load();
    } catch (error: any) {
      setNotice({ tone: 'error', message: error.message || 'Lỗi khi xóa thiết bị.' });
    }
  };

  const canEdit = hasPermission(user, PERMISSIONS.EQUIPMENT_UPDATE);
  const canDelete = hasPermission(user, PERMISSIONS.EQUIPMENT_DELETE);

  return (
    <Protected permission={PERMISSIONS.EQUIPMENT_VIEW}>
      <div className="flex h-full flex-col">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="metric-icon !w-10 !h-10 !rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400 flex items-center justify-center">
                <Settings2 size={20} />
              </span>
              Thiết bị & Tài sản
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Quản lý danh sách thiết bị, cây cấu trúc và thông số kỹ thuật.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Protected permission={PERMISSIONS.EQUIPMENT_CREATE}>
              <button className="button button-primary" onClick={handleOpenCreate}>
                <Plus size={16} className="mr-2" /> Thêm thiết bị
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
                  <th className="px-6 py-4 font-medium">Mã TB</th>
                  <th className="px-6 py-4 font-medium">Tên thiết bị</th>
                  <th className="px-6 py-4 font-medium">Phân loại</th>
                  <th className="px-6 py-4 font-medium">Trạng thái</th>
                  <th className="px-6 py-4 font-medium">Ngày lắp đặt</th>
                  <th className="px-6 py-4 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : equipments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      Chưa có thiết bị nào.
                    </td>
                  </tr>
                ) : (
                  equipments.map((eq) => (
                    <tr key={eq.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{eq.code}</td>
                      <td className="px-6 py-4">{eq.name}</td>
                      <td className="px-6 py-4">{eq.category || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          eq.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          eq.status === 'INACTIVE' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {eq.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">{eq.installationDate ? eq.installationDate.split('T')[0] : '—'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canEdit && (
                            <button
                              className="icon-button"
                              onClick={() => handleOpenEdit(eq)}
                              title="Sửa"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="icon-button text-red-600 hover:text-red-700 hover:border-red-200"
                              onClick={() => handleDelete(eq.id)}
                              title="Xóa"
                            >
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
        title={dialog === 'create' ? 'Thêm thiết bị mới' : 'Cập nhật thiết bị'}
        icon={<span className={dialog === 'create' ? "modal-icon-create" : "modal-icon-edit"}><Settings2 size={20} /></span>}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Mã thiết bị *
              </label>
              <input
                type="text"
                required
                className="form-control"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                disabled={dialog === 'edit'}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tên thiết bị *
              </label>
              <input
                type="text"
                required
                className="form-control"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Phân loại
              </label>
              <input
                type="text"
                className="form-control"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Trạng thái
              </label>
              <select
                className="form-control"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                <option value="MAINTENANCE">Đang bảo trì (MAINTENANCE)</option>
                <option value="INACTIVE">Ngừng hoạt động (INACTIVE)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Ngày lắp đặt
            </label>
            <input
              type="date"
              className="form-control"
              value={form.installationDate}
              onChange={(e) => setForm({ ...form, installationDate: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Mô tả
            </label>
            <textarea
              className="form-control min-h-[80px] resize-none"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setDialog(null)}
              disabled={saving}
            >
              Hủy
            </button>
            <button type="submit" className="button button-primary" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu thông tin'}
            </button>
          </div>
        </form>
      </Modal>
    </Protected>
  );
}
