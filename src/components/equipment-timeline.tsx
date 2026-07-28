'use client';

import { useEffect, useState, useCallback } from 'react';
import { workOrderApi } from '@/lib/api-work-order';
import { WorkOrder } from '@/types/work-order';
import { Wrench, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export function EquipmentTimeline({ tenantSlug, equipmentId }: { tenantSlug: string; equipmentId: string }) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await workOrderApi.getByEquipment(equipmentId);
      setWorkOrders(data);
    } catch (err) { const e = err as Error;
      setError(e.message || 'Lỗi tải lịch sử');
    } finally {
      setLoading(false);
    }
  }, [equipmentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="p-4 text-center text-sm text-gray-500">Đang tải lịch sử...</div>;
  if (error) return <div className="p-4 text-center text-sm text-red-500">{error}</div>;

  if (workOrders.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-gray-500 italic border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
        Thiết bị chưa có lịch sử sự cố hoặc bảo trì nào.
      </div>
    );
  }

  return (
    <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 md:ml-4 space-y-6">
      {workOrders.map((wo) => {
        const isCompleted = wo.status === 'COMPLETED';
        const isIncident = wo.priority === 'URGENT';
        
        return (
          <div key={wo.id} className="relative pl-6">
            <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 ${
              isCompleted ? 'bg-green-500' :
              isIncident ? 'bg-red-500' : 'bg-yellow-500'
            }`} />
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    {isIncident ? <AlertCircle size={16} className="text-red-500" /> : <Wrench size={16} className="text-teal-600" />}
                    <Link href={`/t/${tenantSlug}/work-orders/${wo.id}`} className="hover:underline">
                      {wo.title}
                    </Link>
                  </h3>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                    <Clock size={12} />
                    {new Date(wo.createdAt).toLocaleString('vi-VN')}
                    <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-medium ml-2 uppercase">
                      {wo.status}
                    </span>
                  </div>
                </div>
                <div className={`text-xs px-2 py-1 rounded font-medium ${
                  wo.priority === 'URGENT' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  wo.priority === 'NORMAL' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {wo.priority}
                </div>
              </div>
              
              {wo.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                  {wo.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
