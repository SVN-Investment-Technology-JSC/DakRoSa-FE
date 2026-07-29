'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Network, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeading } from '@/components/page-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { tenancyService } from '@/services/tenancy.service';
import type { Organization } from '@/types/tenancy';

export function OrganizationPage() {
  const [data, setData] = useState<Organization | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [unitType, setUnitType] = useState('department');
  const [parentId, setParentId] = useState('__none__');
  const [positionUnitId, setPositionUnitId] = useState('__none__');

  const loadOrganization = async () => {
    try { setData(await tenancyService.getOrganization()); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Không thể tải cơ cấu tổ chức.'); }
  };
  useEffect(() => {
    let active = true;
    tenancyService.getOrganization()
      .then((org) => { if (active) setData(org); })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Không thể tải cơ cấu tổ chức.'); });
    return () => { active = false; };
  }, []);
  useEffect(() => { if (message) toast.success(message); }, [message]);
  useEffect(() => { if (error) toast.error(error); }, [error]);

  const submitUnit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    try {
      await tenancyService.createUnit({ code: String(form.get('code') ?? ''), name: String(form.get('name') ?? ''), type: unitType, parentId: parentId === '__none__' ? undefined : parentId });
      formElement.reset(); setUnitType('department'); setParentId('__none__'); setMessage('Đã thêm đơn vị tổ chức.'); await loadOrganization();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Không thể thêm đơn vị.'); }
  };
  const submitPosition = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    try {
      await tenancyService.createPosition({ code: String(form.get('code') ?? ''), name: String(form.get('name') ?? ''), organizationUnitId: positionUnitId === '__none__' ? undefined : positionUnitId });
      formElement.reset(); setPositionUnitId('__none__'); setMessage('Đã thêm chức danh.'); await loadOrganization();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Không thể thêm chức danh.'); }
  };
  const deactivate = async (kind: 'units' | 'positions', id: string) => {
    try { await tenancyService.deactivateOrganizationRecord(kind, id); setMessage('Đã ngừng kích hoạt bản ghi.'); await loadOrganization(); }
    catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'Không thể cập nhật bản ghi.'); }
  };

  if (!data) return <p className="text-sm text-muted-foreground">Đang tải cơ cấu tổ chức…</p>;
  const activeUnits = data.units.filter((unit) => unit.isActive);
  const unitName = (id: string | null) => data.units.find((unit) => unit.id === id)?.name ?? '—';

  return <>
    <PageHeading eyebrow="Quản trị doanh nghiệp" title="Cơ cấu tổ chức" description="Chuẩn hóa phòng ban, đơn vị trực thuộc và chức danh để tái sử dụng." />
    <div className="mt-5 grid gap-6 xl:grid-cols-2">
      <Card><CardHeader><CardTitle>Đơn vị và phòng ban</CardTitle></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-2" onSubmit={submitUnit}><Input name="code" placeholder="Mã đơn vị" required /><Input name="name" placeholder="Tên đơn vị/phòng ban" required /><Select value={unitType} onValueChange={setUnitType}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent position="popper"><SelectItem value="department">Phòng ban</SelectItem><SelectItem value="division">Khối/ban</SelectItem><SelectItem value="plant">Nhà máy</SelectItem><SelectItem value="team">Tổ/nhóm</SelectItem></SelectContent></Select><Select value={parentId} onValueChange={setParentId}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent position="popper"><SelectItem value="__none__">Không có cấp trên</SelectItem>{activeUnits.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}</SelectContent></Select><Button type="submit" className="md:col-span-2"><Plus size={18} />Thêm đơn vị</Button></form><div className="mt-5 grid gap-2">{data.units.map((unit) => <div key={unit.id} className="flex gap-3 rounded-lg border border-border p-3"><Network size={18} className="mt-0.5 text-primary" /><div className="min-w-0 flex-1"><strong>{unit.name}</strong><p className="text-sm text-muted-foreground">{unit.code} · {unit.type}{unit.parentId ? ` · Thuộc ${unitName(unit.parentId)}` : ''}</p></div>{unit.isActive && <Button size="sm" variant="ghost" aria-label="Ngừng kích hoạt" onClick={() => void deactivate('units', unit.id)}><Trash2 size={17} /></Button>}</div>)}</div></CardContent></Card>
      <Card><CardHeader><CardTitle>Chức danh</CardTitle></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-2" onSubmit={submitPosition}><Input name="code" placeholder="Mã chức danh" required /><Input name="name" placeholder="Tên chức danh" required /><div><Select value={positionUnitId} onValueChange={setPositionUnitId}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent position="popper"><SelectItem value="__none__">Áp dụng toàn doanh nghiệp</SelectItem>{activeUnits.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}</SelectContent></Select></div><Button type="submit" className="md:col-span-2"><Plus size={18} />Thêm chức danh</Button></form><div className="mt-5 grid gap-2">{data.positions.map((position) => <div key={position.id} className="flex gap-3 rounded-lg border border-border p-3"><Network size={18} className="mt-0.5 text-primary" /><div className="min-w-0 flex-1"><strong>{position.name}</strong><p className="text-sm text-muted-foreground">{position.code} · {unitName(position.organizationUnitId)}</p></div>{position.isActive && <Button size="sm" variant="ghost" aria-label="Ngừng kích hoạt" onClick={() => void deactivate('positions', position.id)}><Trash2 size={17} /></Button>}</div>)}</div></CardContent></Card>
    </div>
  </>;
}
