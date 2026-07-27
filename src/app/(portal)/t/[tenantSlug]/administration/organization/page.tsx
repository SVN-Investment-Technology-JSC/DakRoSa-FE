'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Network, Plus, Trash2 } from 'lucide-react';
import { PageHeading } from '@/components/page-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Notice } from '@/components/ui/notice';
import { apiRequest } from '@/lib/api';

type Unit = { id: string; code: string; name: string; type: string; parentId: string | null; isActive: boolean };
type Position = { id: string; code: string; name: string; organizationUnitId: string | null; isActive: boolean };
type Organization = { units: Unit[]; positions: Position[] };

export default function OrganizationPage() {
  const [data, setData] = useState<Organization | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadOrganization = async () => {
    try { setData(await apiRequest<Organization>('/tenancy/organization')); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Không thể tải cơ cấu tổ chức.'); }
  };
  useEffect(() => {
    let active = true;
    apiRequest<Organization>('/tenancy/organization')
      .then((organization) => { if (active) setData(organization); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Không thể tải cơ cấu tổ chức.');
      });
    return () => { active = false; };
  }, []);

  const submitUnit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await apiRequest('/tenancy/organization/units', { method: 'POST', body: JSON.stringify({ code: form.get('code'), name: form.get('name'), type: form.get('type'), parentId: form.get('parentId') || undefined }) });
      event.currentTarget.reset(); setMessage('Đã thêm đơn vị tổ chức.'); await loadOrganization();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Không thể thêm đơn vị.'); }
  };
  const submitPosition = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await apiRequest('/tenancy/organization/positions', { method: 'POST', body: JSON.stringify({ code: form.get('code'), name: form.get('name'), organizationUnitId: form.get('organizationUnitId') || undefined }) });
      event.currentTarget.reset(); setMessage('Đã thêm chức danh.'); await loadOrganization();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Không thể thêm chức danh.'); }
  };
  const deactivate = async (kind: 'units' | 'positions', id: string) => {
    try { await apiRequest(`/tenancy/organization/${kind}/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive: false }) }); setMessage('Đã ngừng kích hoạt bản ghi.'); await loadOrganization(); }
    catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'Không thể cập nhật bản ghi.'); }
  };

  if (!data) return <p className="text-sm text-muted-foreground">Đang tải cơ cấu tổ chức…</p>;
  const unitName = (id: string | null) => data.units.find((unit) => unit.id === id)?.name ?? '—';

  return <>
    <PageHeading eyebrow="Quản trị doanh nghiệp" title="Cơ cấu tổ chức" description="Chuẩn hóa phòng ban, đơn vị trực thuộc và chức danh để tái sử dụng cho nhân sự, phân quyền dữ liệu và các nhà máy mới." />
    {message && <Notice tone="success">{message}</Notice>}
    {error && <Notice tone="error">{error}</Notice>}
    <div className="mt-5 grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Đơn vị và phòng ban</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={submitUnit}>
            <Input name="code" placeholder="Mã đơn vị" required /><Input name="name" placeholder="Tên đơn vị/phòng ban" required />
            <select name="type" defaultValue="department" className="h-12 rounded-xl border border-input bg-card px-4 text-base"><option value="department">Phòng ban</option><option value="division">Khối/ban</option><option value="plant">Nhà máy</option><option value="team">Tổ/nhóm</option></select>
            <select name="parentId" defaultValue="" className="h-12 rounded-xl border border-input bg-card px-4 text-base"><option value="">Không có cấp trên</option>{data.units.filter((unit) => unit.isActive).map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select>
            <Button type="submit" className="md:col-span-2"><Plus size={18} />Thêm đơn vị</Button>
          </form>
          <div className="mt-5 grid gap-2">{data.units.map((unit) => <div key={unit.id} className="flex gap-3 rounded-lg border border-border p-3"><Network size={18} className="mt-0.5 text-primary" /><div className="min-w-0 flex-1"><strong>{unit.name}</strong><p className="text-sm text-muted-foreground">{unit.code} · {unit.type}{unit.parentId ? ` · Thuộc ${unitName(unit.parentId)}` : ''}</p></div>{unit.isActive && <Button size="sm" variant="ghost" aria-label="Ngừng kích hoạt" onClick={() => void deactivate('units', unit.id)}><Trash2 size={17} /></Button>}</div>)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Chức danh</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={submitPosition}>
            <Input name="code" placeholder="Mã chức danh" required /><Input name="name" placeholder="Tên chức danh" required />
            <select name="organizationUnitId" defaultValue="" className="h-12 rounded-xl border border-input bg-card px-4 text-base md:col-span-2"><option value="">Áp dụng toàn doanh nghiệp</option>{data.units.filter((unit) => unit.isActive).map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select>
            <Button type="submit" className="md:col-span-2"><Plus size={18} />Thêm chức danh</Button>
          </form>
          <div className="mt-5 grid gap-2">{data.positions.map((position) => <div key={position.id} className="flex gap-3 rounded-lg border border-border p-3"><Network size={18} className="mt-0.5 text-primary" /><div className="min-w-0 flex-1"><strong>{position.name}</strong><p className="text-sm text-muted-foreground">{position.code} · {unitName(position.organizationUnitId)}</p></div>{position.isActive && <Button size="sm" variant="ghost" aria-label="Ngừng kích hoạt" onClick={() => void deactivate('positions', position.id)}><Trash2 size={17} /></Button>}</div>)}</div>
        </CardContent>
      </Card>
    </div>
  </>;
}
