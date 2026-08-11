'use client';

import { FormEvent, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { tenancyService } from '@/services/tenancy.service';
import type { OrganizationUnit, Position } from '@/types/tenancy';

type Draft = { id?: string; code: string; name: string; organizationUnitId: string };
const globalScope = '__global__';

export function PositionsManagerDialog({ open, onOpenChange, positions, units, onChanged }: { open: boolean; onOpenChange: (open: boolean) => void; positions: Position[]; units: OrganizationUnit[]; onChanged: () => Promise<void> }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!draft) return;
    const form = new FormData(event.currentTarget);
    const input = { code: String(form.get('code')), name: String(form.get('name')), organizationUnitId: draft.organizationUnitId === globalScope ? undefined : draft.organizationUnitId };
    try {
      if (draft.id) await tenancyService.updateOrganizationPosition(draft.id, input);
      else await tenancyService.createPosition(input);
      setDraft(null); await onChanged(); toast.success('Đã lưu chức danh.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Không thể lưu chức danh.'); }
  };
  const remove = async (position: Position) => {
    if (!confirm(`Xóa chức danh “${position.name}”?`)) return;
    try { await tenancyService.deleteOrganizationPosition(position.id); await onChanged(); toast.success('Đã xóa chức danh.'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Không thể xóa chức danh đang được sử dụng.'); }
  };
  return <><Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Quản lý chức danh</DialogTitle></DialogHeader><div className="flex justify-end"><Button size="sm" onClick={() => setDraft({ code: '', name: '', organizationUnitId: globalScope })}><Plus />Thêm chức danh</Button></div><div className="mt-3 space-y-2">{positions.map((position) => <div className="flex items-center gap-3 rounded-lg border p-3" key={position.id}><div className="min-w-0 flex-1"><p className="font-medium">{position.name}</p><p className="text-xs text-muted-foreground">{position.code} · {units.find((unit) => unit.id === position.organizationUnitId)?.name ?? 'Toàn doanh nghiệp'}</p></div><Button size="icon" variant="ghost" title="Chỉnh sửa" onClick={() => setDraft({ id: position.id, code: position.code, name: position.name, organizationUnitId: position.organizationUnitId ?? globalScope })}><Pencil size={16} /></Button><Button size="icon" variant="ghost" title="Xóa" onClick={() => void remove(position)}><Trash2 size={16} /></Button></div>)}{positions.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Chưa có chức danh.</p>}</div></DialogContent></Dialog><Dialog open={!!draft} onOpenChange={(value) => !value && setDraft(null)}><DialogContent><DialogHeader><DialogTitle>{draft?.id ? 'Chỉnh sửa chức danh' : 'Thêm chức danh'}</DialogTitle></DialogHeader><form className="grid gap-3" onSubmit={save}><Label>Mã chức danh<Input name="code" required defaultValue={draft?.code} /></Label><Label>Tên chức danh<Input name="name" required defaultValue={draft?.name} /></Label><Label>Phạm vi áp dụng<Select value={draft?.organizationUnitId ?? globalScope} onValueChange={(organizationUnitId) => setDraft((current) => current ? { ...current, organizationUnitId } : current)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={globalScope}>Toàn doanh nghiệp</SelectItem>{units.filter((unit) => unit.isActive).map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}</SelectContent></Select></Label><Button type="submit">Lưu chức danh</Button></form></DialogContent></Dialog></>;
}
