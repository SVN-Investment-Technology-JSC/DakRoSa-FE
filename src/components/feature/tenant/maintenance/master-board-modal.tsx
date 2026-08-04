'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { workflowApi } from '@/lib/api-workflow';
import { rolesService } from '@/services/roles.service';
import type { WorkflowRoleMapping } from '@/types/workflow';
import type { Role } from '@/types/rbac';

interface MasterBoardModalProps {
  tenantSlug: string;
  definitionId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MasterBoardModal({ definitionId, isOpen, onClose }: MasterBoardModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mappings, setMappings] = useState<WorkflowRoleMapping[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const loadData = useCallback(async () => {
    if (!definitionId) return;
    try {
      setLoading(true);
      const [boardData, rolesData] = await Promise.all([
        workflowApi.getMasterBoard(definitionId),
        rolesService.getRoles(),
      ]);
      setMappings(boardData);
      setRoles(rolesData || []);
    } catch {
      toast.error('Lỗi khi tải dữ liệu Master Board');
    } finally {
      setLoading(false);
    }
  }, [definitionId]);

  useEffect(() => {
    if (isOpen && definitionId) {
      const timer = window.setTimeout(() => { void loadData(); }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, definitionId, loadData]);



  async function handleSave() {
    if (!definitionId) return;

    // Validate
    if (mappings.some(m => !m.variableKey || !m.mappedType || !m.mappedValue)) {
      toast.error('Vui lòng điền đầy đủ thông tin cho tất cả các dòng');
      return;
    }

    try {
      setSaving(true);
      await workflowApi.updateMasterBoard(definitionId, mappings);
      toast.success('Lưu cấu hình thành công');
      onClose();
    } catch {
      toast.error('Lỗi khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  }

  function handleAdd() {
    setMappings([...mappings, { variableKey: '', mappedType: 'ROLE', mappedValue: '' }]);
  }

  function handleRemove(index: number) {
    const newMappings = [...mappings];
    newMappings.splice(index, 1);
    setMappings(newMappings);
  }

  function handleChange(index: number, field: keyof WorkflowRoleMapping, value: string) {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    // Auto reset value when changing type
    if (field === 'mappedType') {
      newMappings[index].mappedValue = '';
    }
    setMappings(newMappings);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bảng phân quyền tác nhân (Master Board)</DialogTitle>
          <DialogDescription>
            Định nghĩa quy tắc giải mã từ các &quot;Biến số tác nhân&quot; (được thiết kế trong sơ đồ) sang &quot;Vai trò / Người dùng&quot; thực tế trong hệ thống.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="text-center text-sm text-gray-500 py-8">Đang tải cấu hình...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-[120px_150px_minmax(0,1fr)_40px] gap-2 font-medium text-xs text-gray-500 px-1">
                <div>Biến số (Key)</div>
                <div>Loại phân công</div>
                <div>Giá trị (Vai trò/Phòng)</div>
                <div></div>
              </div>

              {mappings.length === 0 ? (
                <div className="text-center text-sm text-gray-400 py-4 border-2 border-dashed rounded-lg">
                  Chưa có quy tắc phân quyền nào
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {mappings.map((mapping, idx) => (
                    <div key={idx} className="grid grid-cols-[120px_150px_minmax(0,1fr)_40px] gap-2 items-start">
                      <Input
                        placeholder="VD: 1, 2, TP"
                        value={mapping.variableKey}
                        onChange={(e) => handleChange(idx, 'variableKey', e.target.value)}
                        className="h-9"
                      />

                      <Select
                        value={mapping.mappedType}
                        onValueChange={(val) => handleChange(idx, 'mappedType', val)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ROLE">Vai trò (Role)</SelectItem>
                          <SelectItem value="DEPT">Phòng ban</SelectItem>
                          <SelectItem value="USER">Người dùng</SelectItem>
                        </SelectContent>
                      </Select>

                      {mapping.mappedType === 'ROLE' ? (
                        <Select
                          value={mapping.mappedValue}
                          onValueChange={(val) => handleChange(idx, 'mappedValue', val)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Chọn vai trò" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map(r => (
                              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          placeholder={mapping.mappedType === 'DEPT' ? "Mã phòng ban" : "Mã NV"}
                          value={mapping.mappedValue}
                          onChange={(e) => handleChange(idx, 'mappedValue', e.target.value)}
                          className="h-9"
                        />
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleRemove(idx)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full mt-2 border-dashed border-2 text-emerald-600 hover:bg-emerald-50"
                onClick={handleAdd}
              >
                <Plus size={16} className="mr-2" />
                Thêm quy tắc mới
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button
            onClick={() => void handleSave()}
            disabled={saving || loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? 'Đang lưu...' : 'Lưu bảng phân quyền'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
