'use client';

import { ArrowLeft, Settings2, Calendar, Activity, Tag, Info, PenLine, FileText, Upload, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Protected } from '@/components/protected';
import { PERMISSIONS } from '@/lib/navigation';
import { equipmentApi } from '@/lib/api-equipment';
import { storageApi } from '@/lib/api-storage';
import { Equipment } from '@/types/equipment';
import { EquipmentTimeline } from '@/components/equipment-timeline';

export default function EquipmentDetailsPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const equipmentId = params.id as string;
  
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, docs] = await Promise.all([
        equipmentApi.getById(equipmentId),
        equipmentApi.getDocuments(equipmentId)
      ]);
      setEquipment(data);
      setDocuments(docs);
    } catch (err) { const e = err as Error;
      setError(e.message || 'Lỗi khi tải thông tin thiết bị.');
    } finally {
      setLoading(false);
    }
  }, [equipmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1. Upload to storage
      const uploaded = await storageApi.uploadFile(file, 'equipment');
      
      // 2. Link to equipment
      await equipmentApi.addDocument(equipmentId, {
        name: uploaded.originalName,
        type: uploaded.mimeType,
        fileUrl: uploaded.url, // Usually we save fileName and fetch URL later, but for simplicity saving URL
      });

      // Reload docs
      const docs = await equipmentApi.getDocuments(equipmentId);
      setDocuments(docs);
    } catch (err) {
      alert('Lỗi khi tải lên file: ' + (err as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tài liệu này?')) return;
    try {
      await equipmentApi.removeDocument(equipmentId, docId);
      setDocuments(documents.filter(d => d.id !== docId));
    } catch (err) {
      alert('Lỗi khi xóa tài liệu: ' + (err as Error).message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Đang tải thông tin thiết bị...</div>;
  }

  if (error || !equipment) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>{error || 'Không tìm thấy thiết bị'}</p>
        <Link href={`/t/${tenantSlug}/equipment`} className="mt-4 text-teal-600 hover:underline block">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <Protected permission={PERMISSIONS.EQUIPMENT_VIEW}>
      <div className="flex h-full flex-col max-w-5xl mx-auto w-full">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href={`/t/${tenantSlug}/equipment`}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              aria-label="Quay lại"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="metric-icon !w-10 !h-10 !rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400 flex items-center justify-center">
                  <Settings2 size={20} />
                </span>
                {equipment.name}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Tag size={14} /> Mã: {equipment.code}
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                  equipment.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                  equipment.status === 'INACTIVE' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400' :
                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}>
                  {equipment.status}
                </span>
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <section className="card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                <Info size={16} /> Thông tin chung
              </h2>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Phân loại</dt>
                  <dd className="font-medium mt-1">{equipment.category || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Ngày lắp đặt</dt>
                  <dd className="font-medium mt-1 flex items-center gap-2">
                    <Calendar size={14} />
                    {equipment.installationDate ? equipment.installationDate.split('T')[0] : '—'}
                  </dd>
                </div>
                {equipment.parentId && (
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Thiết bị cha</dt>
                    <dd className="font-medium mt-1">
                      <Link href={`/t/${tenantSlug}/equipment/${equipment.parentId}`} className="text-teal-600 hover:underline">
                        Đến thiết bị cha
                      </Link>
                    </dd>
                  </div>
                )}
                {equipment.description && (
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Mô tả</dt>
                    <dd className="mt-1 whitespace-pre-wrap">{equipment.description}</dd>
                  </div>
                )}
              </dl>
            </section>
          </div>
          
          <div className="md:col-span-2 space-y-6">
            <section className="card p-5 min-h-[200px]">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                <PenLine size={16} /> Thông số kỹ thuật
              </h2>
              {equipment.specs && Object.keys(equipment.specs).length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(equipment.specs).map(([key, value]) => (
                    <div key={key} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div className="text-xs text-gray-500">{key}</div>
                      <div className="font-medium text-sm mt-1">{String(value)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">Chưa có thông số kỹ thuật.</div>
              )}
            </section>
            
            <section className="card p-5 min-h-[200px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                  <Activity size={16} /> Tài liệu & Hình ảnh
                </h2>
                <div>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={uploading}
                    className="button button-secondary text-xs py-1.5"
                  >
                    {uploading ? <Loader2 size={14} className="animate-spin mr-1" /> : <Upload size={14} className="mr-1" />}
                    {uploading ? 'Đang tải lên...' : 'Tải lên tài liệu'}
                  </button>
                </div>
              </div>
              
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map(doc => {
                    const isImage = doc.type?.startsWith('image/');
                    return (
                      <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-800 rounded-lg">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`p-2 rounded-md ${isImage ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                            {isImage ? <ImageIcon size={20} /> : <FileText size={20} />}
                          </div>
                          <div className="min-w-0">
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-900 dark:text-white hover:underline truncate block">
                              {doc.name}
                            </a>
                            <div className="text-xs text-gray-500 mt-0.5">{doc.type || 'Không xác định'}</div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                          title="Xóa tài liệu"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic py-4 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
                  Chưa có tài liệu đính kèm.
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Timeline Section */}
        <div className="mt-6">
          <section className="card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-6 flex items-center gap-2">
              <Calendar size={16} /> Lịch sử sự cố & Bảo trì
            </h2>
            <EquipmentTimeline tenantSlug={tenantSlug} equipmentId={equipmentId} />
          </section>
        </div>
      </div>
    </Protected>
  );
}
