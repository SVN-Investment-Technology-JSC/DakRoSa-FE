'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Protected } from '@/components/protected';
import { PERMISSIONS } from '@/lib/navigation';
import { workOrderApi } from '@/lib/api-work-order';
import { equipmentApi } from '@/lib/api-equipment';
import { WorkOrder } from '@/types/work-order';
import { Equipment } from '@/types/equipment';
import { useAuth } from '@/providers/auth-provider';
import { hasPermission } from '@/lib/permissions';
import { ChevronLeft, Save, AlertCircle, CheckCircle2, Wrench, Clock, FileText, Package, ListTree, Activity, Trash2, Upload, Loader2, FileText as FileTextIcon, Image as ImageIcon, Plus } from 'lucide-react';
import Link from 'next/link';
import { inventoryApi } from '@/lib/api-inventory';
import { InventoryItem } from '@/types/inventory';

type Tab = 'info' | 'materials' | 'attachments' | 'logs';

export default function WorkOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;
  const id = params.id as string;
  const { user } = useAuth();

  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [stock, setStock] = useState<InventoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  // Material Form
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [matForm, setMatForm] = useState({ inventoryId: '', quantity: 1 });

  const [form, setForm] = useState({
    status: '',
    priority: '',
    downtimeMinutes: 0,
    rootCause: '',
    description: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await workOrderApi.getById(id);
      setWo(data);
      setForm({
        status: data.status,
        priority: data.priority,
        downtimeMinutes: data.downtimeMinutes,
        rootCause: data.rootCause || '',
        description: data.description || '',
      });
      if (data.equipmentId) {
        const eq = await equipmentApi.getById(data.equipmentId);
        setEquipment(eq);
      }
      const [woLogs, woMaterials, stockData] = await Promise.all([
        workOrderApi.getLogs(id),
        workOrderApi.getMaterials(id),
        inventoryApi.getStock(),
      ]);
      setLogs(woLogs);
      setMaterials(woMaterials);
      setStock(stockData.filter(s => s.quantity > 0)); // Only show available stock
    } catch {
      setNotice({ tone: 'error', message: 'Không thể tải thông tin phiếu công việc.' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await workOrderApi.update(id, {
        status: form.status as any,
        priority: form.priority as any,
        downtimeMinutes: Number(form.downtimeMinutes),
        rootCause: form.rootCause,
        description: form.description,
      });
      setNotice({ tone: 'success', message: 'Cập nhật thành công!' });
      load();
    } catch (err: any) {
      setNotice({ tone: 'error', message: err.message || 'Có lỗi xảy ra.' });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setNotice(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/storage/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      
      const currentAttachments = wo?.attachments || [];
      const newAttachments = [...currentAttachments, data.url];
      
      await workOrderApi.update(id, { attachments: newAttachments });
      setNotice({ tone: 'success', message: 'Tải lên tài liệu thành công!' });
      load();
    } catch (error: any) {
      setNotice({ tone: 'error', message: error.message || 'Lỗi tải file' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (url: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tài liệu này?')) return;
    try {
      const currentAttachments = wo?.attachments || [];
      const newAttachments = currentAttachments.filter(a => a !== url);
      await workOrderApi.update(id, { attachments: newAttachments });
      setNotice({ tone: 'success', message: 'Đã xóa tài liệu.' });
      load();
    } catch (err: any) {
      setNotice({ tone: 'error', message: err.message || 'Lỗi xóa tài liệu' });
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matForm.inventoryId || matForm.quantity <= 0) return;
    const inv = stock.find(s => s.id === matForm.inventoryId);
    if (!inv) return;

    setSaving(true);
    setNotice(null);
    try {
      await workOrderApi.addMaterial(id, {
        materialId: inv.materialId,
        warehouseId: inv.warehouseId,
        quantity: matForm.quantity,
      });
      setNotice({ tone: 'success', message: 'Thêm vật tư thành công.' });
      setShowMaterialForm(false);
      load();
    } catch (err: any) {
      setNotice({ tone: 'error', message: err.message || 'Lỗi thêm vật tư.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMaterial = async (materialId: string, warehouseId: string) => {
    if (!confirm('Bạn có chắc chắn muốn trả lại vật tư này vào kho?')) return;
    setSaving(true);
    try {
      await workOrderApi.removeMaterial(id, warehouseId, materialId);
      setNotice({ tone: 'success', message: 'Đã xóa vật tư.' });
      load();
    } catch (err: any) {
      setNotice({ tone: 'error', message: err.message || 'Lỗi xóa vật tư' });
    } finally {
      setSaving(false);
    }
  };

  const canEdit = hasPermission(user, PERMISSIONS.WORK_ORDER_UPDATE);

  if (loading) return <div className="p-8 text-center text-gray-500">Đang tải...</div>;
  if (!wo) return <div className="p-8 text-center text-red-500">Phiếu công việc không tồn tại.</div>;

  const isIncident = wo.type === 'INCIDENT';

  return (
    <Protected permission={PERMISSIONS.WORK_ORDER_VIEW}>
      <div className="flex h-full flex-col">
        <header className="mb-6">
          <Link href={`/t/${tenantSlug}/work-orders`} className="inline-flex items-center text-sm text-teal-600 hover:text-teal-700 mb-4 font-medium transition-colors">
            <ChevronLeft size={16} className="mr-1" /> Quay lại danh sách
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-md ${isIncident ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'}`}>
                  {isIncident ? 'Sự cố' : 'Bảo trì'}
                </span>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {wo.code}
                </h1>
              </div>
              <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">{wo.title}</p>
            </div>
            
            <div className="flex gap-2">
              <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold uppercase tracking-wider ${
                wo.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                wo.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
                wo.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {wo.status}
              </span>
            </div>
          </div>
        </header>

        {notice && (
          <div className={`mb-6 flex items-center gap-2 rounded-lg p-4 text-sm ${notice.tone === 'error' ? 'bg-red-50 text-red-600' : 'bg-teal-50 text-teal-600'}`}>
            {notice.tone === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            {notice.message}
          </div>
        )}

        {/* Stepper Kanban */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
            
            {['DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].map((step, idx) => {
              const statusOrder = ['DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'];
              const currentIdx = statusOrder.indexOf(wo.status);
              const stepIdx = statusOrder.indexOf(step);
              
              const isPast = stepIdx <= currentIdx;
              const isCurrent = stepIdx === currentIdx;
              
              return (
                <div key={step} className="relative flex flex-col items-center group">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-900 z-10 transition-colors ${
                    isPast ? 'bg-teal-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                  }`}>
                    {isPast && !isCurrent ? <CheckCircle2 size={16} /> : <span className="text-xs font-bold">{idx + 1}</span>}
                  </div>
                  <span className={`absolute top-10 text-xs font-semibold whitespace-nowrap ${isCurrent ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500'}`}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
          {[
            { id: 'info', icon: FileText, label: 'Chi tiết & Cập nhật' },
            { id: 'materials', icon: Package, label: 'Vật tư sử dụng' },
            { id: 'attachments', icon: ListTree, label: 'Tài liệu đính kèm' },
            { id: 'logs', icon: Activity, label: 'Lịch sử thao tác' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-900/10'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 pb-10">
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <form onSubmit={handleSaveInfo} className="card p-6">
                  <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Cập nhật trạng thái</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trạng thái hiện tại</label>
                      <select disabled={!canEdit} className="form-control" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                        <option value="DRAFT">Nháp (DRAFT)</option>
                        <option value="ASSIGNED">Đã phân công (ASSIGNED)</option>
                        <option value="IN_PROGRESS">Đang xử lý (IN_PROGRESS)</option>
                        <option value="COMPLETED">Hoàn thành (COMPLETED)</option>
                        <option value="CLOSED">Đóng (CLOSED)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Độ ưu tiên</label>
                      <select disabled={!canEdit} className="form-control" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                        <option value="LOW">Thấp (LOW)</option>
                        <option value="NORMAL">Bình thường (NORMAL)</option>
                        <option value="HIGH">Cao (HIGH)</option>
                        <option value="URGENT">Khẩn cấp (URGENT)</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mô tả công việc</label>
                    <textarea disabled={!canEdit} className="form-control min-h-[100px]" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Mô tả chi tiết công việc hoặc lỗi..." />
                  </div>

                  {isIncident && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/50 rounded-xl space-y-4 mb-4">
                      <h3 className="text-sm font-semibold text-red-800 dark:text-red-400 flex items-center gap-2">
                        <AlertCircle size={16} /> Ghi nhận sự cố
                      </h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Thời gian dừng máy (phút)</label>
                        <input disabled={!canEdit} type="number" min="0" className="form-control" value={form.downtimeMinutes} onChange={e => setForm({...form, downtimeMinutes: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nguyên nhân (Root Cause)</label>
                        <textarea disabled={!canEdit} className="form-control min-h-[80px]" value={form.rootCause} onChange={e => setForm({...form, rootCause: e.target.value})} placeholder="Nguyên nhân gây ra sự cố..." />
                      </div>
                    </div>
                  )}

                  {canEdit && (
                    <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                      <button type="submit" disabled={saving} className="button button-primary min-w-[120px]">
                        {saving ? 'Đang lưu...' : <><Save size={16} className="mr-2" /> Lưu thay đổi</>}
                      </button>
                    </div>
                  )}
                </form>
              </div>

              <div className="space-y-6">
                <div className="card p-6">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                    <Wrench size={16} className="text-teal-500" /> Thiết bị liên quan
                  </h3>
                  {equipment ? (
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-gray-500">Mã thiết bị</div>
                        <div className="font-medium text-teal-600">{equipment.code}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Tên thiết bị</div>
                        <div className="font-medium">{equipment.name}</div>
                      </div>
                      <Link href={`/t/${tenantSlug}/equipment/${equipment.id}`} className="text-sm text-blue-600 hover:underline mt-2 inline-block">
                        Xem hồ sơ thiết bị &rarr;
                      </Link>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">Phiếu không gắn với thiết bị cụ thể.</div>
                  )}
                </div>

                <div className="card p-6">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                    <Clock size={16} className="text-gray-500" /> Thời gian
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-gray-500">Ngày tạo</span>
                      <span className="font-medium">{new Date(wo.createdAt).toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-gray-500">Bắt đầu xử lý</span>
                      <span className="font-medium">{wo.startTime ? new Date(wo.startTime).toLocaleString('vi-VN') : '—'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-500">Hoàn thành</span>
                      <span className="font-medium">{wo.endTime ? new Date(wo.endTime).toLocaleString('vi-VN') : '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Vật tư & Phụ tùng sử dụng
                </h3>
                {canEdit && !showMaterialForm && (
                  <button onClick={() => setShowMaterialForm(true)} className="button button-primary text-xs py-1.5">
                    <Plus size={14} className="mr-1" /> Thêm vật tư
                  </button>
                )}
              </div>

              {showMaterialForm && (
                <form onSubmit={handleAddMaterial} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg mb-6 border border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chọn vật tư trong kho</label>
                      <select
                        required
                        value={matForm.inventoryId}
                        onChange={e => setMatForm({ ...matForm, inventoryId: e.target.value })}
                        className="input"
                      >
                        <option value="">-- Chọn --</option>
                        {stock.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.material?.name} ({s.material?.code}) - Kho: {s.warehouse?.name} (Tồn: {s.quantity})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Số lượng xuất</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={matForm.quantity}
                        onChange={e => setMatForm({ ...matForm, quantity: parseInt(e.target.value) })}
                        className="input"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button type="submit" disabled={saving} className="button button-primary text-xs py-1.5">
                      Xác nhận thêm
                    </button>
                    <button type="button" onClick={() => setShowMaterialForm(false)} className="button button-secondary text-xs py-1.5">
                      Hủy
                    </button>
                  </div>
                </form>
              )}

              {materials.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800/50 border-y border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="px-4 py-3">Mã vật tư</th>
                        <th className="px-4 py-3">Tên vật tư</th>
                        <th className="px-4 py-3">Kho xuất</th>
                        <th className="px-4 py-3">Số lượng</th>
                        {canEdit && <th className="px-4 py-3 text-right">Thao tác</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {materials.map((m: any) => (
                        <tr key={`${m.materialId}-${m.warehouseId}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{m.material?.code}</td>
                          <td className="px-4 py-3">{m.material?.name}</td>
                          <td className="px-4 py-3">{m.warehouse?.name || '---'}</td>
                          <td className="px-4 py-3 font-semibold text-teal-600">{m.quantity} {m.material?.unit}</td>
                          {canEdit && (
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleRemoveMaterial(m.materialId, m.warehouseId)}
                                className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                title="Trả lại kho"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic text-center py-12">
                  Chưa có vật tư nào được xuất cho phiếu này.
                </div>
              )}
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Tài liệu & Hình ảnh
                </h3>
                {canEdit && (
                  <div>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="button button-secondary text-xs">
                      {uploading ? <Loader2 size={14} className="animate-spin mr-1" /> : <Upload size={14} className="mr-1" />}
                      {uploading ? 'Đang tải lên...' : 'Tải lên tài liệu'}
                    </button>
                  </div>
                )}
              </div>
              
              {(wo.attachments && wo.attachments.length > 0) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {wo.attachments.map((url, idx) => {
                    const filename = url.split('/').pop() || `File ${idx + 1}`;
                    const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-800 rounded-lg">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`p-2 rounded-md ${isImage ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                            {isImage ? <ImageIcon size={20} /> : <FileTextIcon size={20} />}
                          </div>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-900 dark:text-white hover:underline truncate">
                            {filename}
                          </a>
                        </div>
                        {canEdit && (
                          <button onClick={() => handleDeleteAttachment(url)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                  Chưa có tài liệu đính kèm.
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="card p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-6 flex items-center gap-2">
                <Activity size={16} /> Lịch sử thao tác
              </h3>
              
              {logs.length > 0 ? (
                <div className="relative border-l-2 border-gray-100 dark:border-gray-800 ml-3 space-y-6 pb-4">
                  {logs.map((log: any) => (
                    <div key={log.id} className="relative pl-6">
                      <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-white dark:bg-gray-900 border-2 border-teal-500" />
                      <div className="text-xs text-gray-500 mb-1">
                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                      </div>
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        {log.action}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {log.note}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Bởi: {log.user?.fullName || 'Hệ thống'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic text-center py-12">
                  Chưa có lịch sử thao tác.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Protected>
  );
}
