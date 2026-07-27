'use client';

import { Package, Edit2, Plus, AlertCircle, CheckCircle2, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Protected } from '@/components/protected';
import { PERMISSIONS } from '@/lib/navigation';
import { inventoryApi } from '@/lib/api-inventory';
import { Material, InventoryItem } from '@/types/inventory';
import { Modal } from '@/components/ui/modal';
import { hasPermission } from '@/lib/permissions';
import { useAuth } from '@/providers/auth-provider';

export default function InventoryPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'materials' | 'stock'>('stock');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stock, setStock] = useState<InventoryItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  
  const [dialog, setDialog] = useState<'create_material' | 'edit_material' | 'transaction' | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  
  // Material Form
  const [matForm, setMatForm] = useState({
    code: '', name: '', category: '', unit: '', minStock: 0, isActive: true
  });
  
  // Transaction Form
  const [txForm, setTxForm] = useState({
    warehouseId: '11111111-1111-1111-1111-111111111111', // Placeholder or fetch actual warehouses
    materialId: '',
    type: 'IN' as 'IN' | 'OUT',
    quantity: 1,
    note: ''
  });

  const loadMaterials = useCallback(async () => {
    try {
      const data = await inventoryApi.getMaterials();
      setMaterials(data);
    } catch {
      setNotice({ tone: 'error', message: 'Lỗi tải danh sách vật tư' });
    }
  }, []);

  const loadStock = useCallback(async () => {
    try {
      const data = await inventoryApi.getStock();
      setStock(data);
    } catch {
      setNotice({ tone: 'error', message: 'Lỗi tải tồn kho' });
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadMaterials(), loadStock()]);
    setLoading(false);
  }, [loadMaterials, loadStock]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const handleOpenCreateMaterial = () => {
    setMatForm({ code: '', name: '', category: '', unit: '', minStock: 0, isActive: true });
    setDialog('create_material');
  };

  const handleOpenEditMaterial = (m: Material) => {
    setSelectedMaterial(m);
    setMatForm({
      code: m.code, name: m.name, category: m.category || '', unit: m.unit, minStock: m.minStock, isActive: m.isActive
    });
    setDialog('edit_material');
  };

  const handleOpenTransaction = () => {
    setTxForm({ warehouseId: '11111111-1111-1111-1111-111111111111', materialId: materials[0]?.id || '', type: 'IN', quantity: 1, note: '' });
    setDialog('transaction');
  };

  const handleMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const payload = {
        code: matForm.code,
        name: matForm.name,
        category: matForm.category || undefined,
        unit: matForm.unit,
        minStock: Number(matForm.minStock),
        isActive: matForm.isActive
      };
      if (dialog === 'create_material') {
        await inventoryApi.createMaterial(payload);
        setNotice({ tone: 'success', message: 'Thêm vật tư thành công.' });
      } else if (dialog === 'edit_material' && selectedMaterial) {
        await inventoryApi.updateMaterial(selectedMaterial.id, payload);
        setNotice({ tone: 'success', message: 'Cập nhật vật tư thành công.' });
      }
      setDialog(null);
      loadMaterials();
    } catch (err) { const error = err as Error;
      setNotice({ tone: 'error', message: error.message || 'Lỗi lưu vật tư.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      if (!txForm.materialId) throw new Error('Vui lòng chọn vật tư');
      await inventoryApi.transaction({
        warehouseId: txForm.warehouseId,
        materialId: txForm.materialId,
        type: txForm.type,
        quantity: Number(txForm.quantity),
        note: txForm.note || undefined,
      });
      setNotice({ tone: 'success', message: 'Giao dịch thành công.' });
      setDialog(null);
      loadStock();
    } catch (err) { const error = err as Error;
      setNotice({ tone: 'error', message: error.message || 'Lỗi giao dịch kho.' });
    } finally {
      setSaving(false);
    }
  };

  const canEditMaterial = hasPermission(user, PERMISSIONS.INVENTORY_CREATE); // Reuse create permission for edit in UI for now

  return (
    <Protected permission={PERMISSIONS.INVENTORY_VIEW}>
      <div className="flex h-full flex-col">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="metric-icon !w-10 !h-10 !rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400 flex items-center justify-center">
                <Package size={20} />
              </span>
              Vật tư & Kho
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Quản lý danh sách vật tư, theo dõi tồn kho và nhập xuất.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Protected permission={PERMISSIONS.INVENTORY_TRANSACTION}>
              <button 
                className="button button-secondary"
                onClick={handleOpenTransaction}
              >
                <ArrowRightLeft size={16} className="mr-2" /> Nhập / Xuất kho
              </button>
            </Protected>
            <Protected permission={PERMISSIONS.INVENTORY_CREATE}>
              <button className="button button-primary" onClick={handleOpenCreateMaterial}>
                <Plus size={16} className="mr-2" /> Thêm vật tư
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

        <div className="mb-4 flex gap-4 border-b border-gray-200 dark:border-gray-800">
          <button
            className={`pb-2 font-medium text-sm transition-colors ${
              tab === 'stock' ? 'border-b-2 border-teal-500 text-teal-600 dark:text-teal-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
            onClick={() => setTab('stock')}
          >
            Tồn kho hiện tại
          </button>
          <button
            className={`pb-2 font-medium text-sm transition-colors ${
              tab === 'materials' ? 'border-b-2 border-teal-500 text-teal-600 dark:text-teal-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
            onClick={() => setTab('materials')}
          >
            Danh mục vật tư
          </button>
        </div>

        <div className="card flex-1 p-0 overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            {tab === 'stock' ? (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50/50 text-gray-500 dark:border-gray-800 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 font-medium">Kho</th>
                    <th className="px-6 py-4 font-medium">Mã vật tư</th>
                    <th className="px-6 py-4 font-medium">Tên vật tư</th>
                    <th className="px-6 py-4 font-medium">Tồn kho</th>
                    <th className="px-6 py-4 font-medium">Đơn vị</th>
                    <th className="px-6 py-4 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {loading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">Đang tải...</td></tr>
                  ) : stock.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">Chưa có dữ liệu tồn kho.</td></tr>
                  ) : (
                    stock.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-4">{item.warehouse?.name || 'Kho chính'}</td>
                        <td className="px-6 py-4 font-medium">{item.material?.code}</td>
                        <td className="px-6 py-4">{item.material?.name}</td>
                        <td className="px-6 py-4 font-semibold">{item.quantity}</td>
                        <td className="px-6 py-4">{item.material?.unit}</td>
                        <td className="px-6 py-4">
                          {item.material && item.quantity <= item.material.minStock ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                              <AlertTriangle size={14} /> Sắp hết
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">Đủ kho</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50/50 text-gray-500 dark:border-gray-800 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 font-medium">Mã vật tư</th>
                    <th className="px-6 py-4 font-medium">Tên vật tư</th>
                    <th className="px-6 py-4 font-medium">Phân loại</th>
                    <th className="px-6 py-4 font-medium">Đơn vị</th>
                    <th className="px-6 py-4 font-medium">Tồn tối thiểu</th>
                    <th className="px-6 py-4 font-medium text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {loading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">Đang tải...</td></tr>
                  ) : materials.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">Chưa có vật tư nào.</td></tr>
                  ) : (
                    materials.map((mat) => (
                      <tr key={mat.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-4 font-medium">{mat.code}</td>
                        <td className="px-6 py-4">{mat.name}</td>
                        <td className="px-6 py-4">{mat.category || '—'}</td>
                        <td className="px-6 py-4">{mat.unit}</td>
                        <td className="px-6 py-4">{mat.minStock}</td>
                        <td className="px-6 py-4 text-right">
                          {canEditMaterial && (
                            <button className="icon-button ml-auto" onClick={() => handleOpenEditMaterial(mat)} title="Sửa">
                              <Edit2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Material Modal */}
      <Modal
        open={dialog === 'create_material' || dialog === 'edit_material'}
        onClose={() => !saving && setDialog(null)}
        title={dialog === 'create_material' ? 'Thêm vật tư mới' : 'Cập nhật vật tư'}
        icon={<span className={dialog === 'create_material' ? "modal-icon-create" : "modal-icon-edit"}><Package size={20} /></span>}
      >
        <form onSubmit={handleMaterialSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Mã vật tư *</label>
              <input type="text" required className="form-control" value={matForm.code} onChange={(e) => setMatForm({ ...matForm, code: e.target.value })} disabled={dialog === 'edit_material'} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tên vật tư *</label>
              <input type="text" required className="form-control" value={matForm.name} onChange={(e) => setMatForm({ ...matForm, name: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Nhóm/Phân loại</label>
              <input type="text" className="form-control" value={matForm.category} onChange={(e) => setMatForm({ ...matForm, category: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Đơn vị tính *</label>
              <input type="text" required className="form-control" value={matForm.unit} onChange={(e) => setMatForm({ ...matForm, unit: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tồn tối thiểu cảnh báo</label>
              <input type="number" min="0" className="form-control" value={matForm.minStock} onChange={(e) => setMatForm({ ...matForm, minStock: Number(e.target.value) })} />
            </div>
            {dialog === 'edit_material' && (
              <div className="flex items-center mt-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={matForm.isActive} onChange={(e) => setMatForm({ ...matForm, isActive: e.target.checked })} />
                  Đang hoạt động
                </label>
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button type="button" className="button button-secondary" onClick={() => setDialog(null)} disabled={saving}>Hủy</button>
            <button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thông tin'}</button>
          </div>
        </form>
      </Modal>

      {/* Transaction Modal */}
      <Modal
        open={dialog === 'transaction'}
        onClose={() => !saving && setDialog(null)}
        title="Giao dịch kho (Nhập / Xuất)"
        icon={<span className="modal-icon-create !bg-blue-100 !text-blue-600"><ArrowRightLeft size={20} /></span>}
      >
        <form onSubmit={handleTransactionSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Loại giao dịch *</label>
            <select className="form-control" value={txForm.type} onChange={(e) => setTxForm({ ...txForm, type: e.target.value as 'IN' | 'OUT' })}>
              <option value="IN">Nhập kho (IN)</option>
              <option value="OUT">Xuất kho (OUT)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Vật tư *</label>
            <select required className="form-control" value={txForm.materialId} onChange={(e) => setTxForm({ ...txForm, materialId: e.target.value })}>
              <option value="">-- Chọn vật tư --</option>
              {materials.map(m => (
                <option key={m.id} value={m.id}>{m.code} - {m.name} ({m.unit})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Số lượng *</label>
            <input type="number" min="1" required className="form-control" value={txForm.quantity} onChange={(e) => setTxForm({ ...txForm, quantity: Number(e.target.value) })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Ghi chú</label>
            <textarea className="form-control min-h-[60px] resize-none" value={txForm.note} onChange={(e) => setTxForm({ ...txForm, note: e.target.value })} placeholder="Lý do nhập/xuất, tham chiếu..." />
          </div>
          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button type="button" className="button button-secondary" onClick={() => setDialog(null)} disabled={saving}>Hủy</button>
            <button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Đang thực hiện...' : 'Xác nhận'}</button>
          </div>
        </form>
      </Modal>
    </Protected>
  );
}
