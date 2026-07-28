'use client';

import { Building2, Plus, Save, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { PageHeading } from '@/components/page-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Notice } from '@/components/ui/notice';
import { apiRequest } from '@/lib/api';

const modules = [
  ['administration', 'Quản trị doanh nghiệp'], ['e-office', 'E-Office'], ['digital-signature', 'Chữ ký số'], ['organization', 'Cơ cấu tổ chức'], ['hrm', 'HRM'], ['attendance', 'Chấm công'], ['workspace', 'Không gian làm việc'], ['planning', 'Kế hoạch'], ['kpi', 'KPI'], ['project-management', 'Quản lý dự án'], ['internal-administration', 'Hành chính nội bộ'], ['cmms', 'Vận hành (EAM/CMMS)'],
] as const;
type Tenant = { id: string; code: string; slug: string; name: string; shortName: string; primaryColor: string; locale: string; timezone: string; enabledModules: string[]; siteCount?: number; memberCount?: number };
type CreatedTenant = Tenant & { initialAdmin: { username: string; password: string; displayName: string } };

function ModuleChecklist({ enabled, onChange, disabled = false }: { enabled: string[]; onChange: (next: string[]) => void; disabled?: boolean }) {
  return <div className="grid gap-2 sm:grid-cols-2">{modules.map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"><input type="checkbox" checked={enabled.includes(key)} disabled={disabled} onChange={(event) => onChange(event.target.checked ? [...enabled, key] : enabled.filter((item) => item !== key))} /><span>{label}</span></label>)}</div>;
}

export default function PlatformTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [archivedTenants, setArchivedTenants] = useState<Tenant[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [enabled, setEnabled] = useState<string[]>(['administration', 'e-office', 'digital-signature', 'organization']);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [initialAdmin, setInitialAdmin] = useState<CreatedTenant['initialAdmin'] | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [permanentlyDeletingId, setPermanentlyDeletingId] = useState<string | null>(null);
  const [permanentConfirmations, setPermanentConfirmations] = useState<Record<string, string>>({});
  const selected = tenants.find((tenant) => tenant.id === selectedId);
  const loadTenants = async () => {
    try { setTenants(await apiRequest<Tenant[]>('/platform/tenants')); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách doanh nghiệp.'); }
  };
  const loadArchivedTenants = async () => {
    try { setArchivedTenants(await apiRequest<Tenant[]>('/platform/tenants/archived')); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Không thể tải doanh nghiệp đã lưu trữ.'); }
  };
  useEffect(() => {
    let active = true;
    Promise.all([apiRequest<Tenant[]>('/platform/tenants'), apiRequest<Tenant[]>('/platform/tenants/archived')])
      .then(([items, archivedItems]) => { if (active) { setTenants(items); setArchivedTenants(archivedItems); } })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách doanh nghiệp.');
      });
    return () => { active = false; };
  }, []);

  const createTenant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCreating) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError('');
    setIsCreating(true);
    try {
      const created = await apiRequest<CreatedTenant>('/platform/tenants', { method: 'POST', body: JSON.stringify({ code: form.get('code'), slug: form.get('slug'), name: form.get('name'), shortName: form.get('shortName'), locale: 'vi-VN', timezone: 'Asia/Ho_Chi_Minh', primaryColor: '#386948', enabledModules: ['core', ...enabled] }) });
      formElement.reset();
      setTenants((current) => [created, ...current]);
      setSelectedId(created.id);
      setInitialAdmin(created.initialAdmin);
      setMessage('Đã tạo doanh nghiệp và tài khoản quản trị doanh nghiệp. Hãy lưu mật khẩu ban đầu ngay bây giờ.');
      await Promise.all([loadTenants(), loadArchivedTenants()]);
    } catch (createError) { setError(createError instanceof Error ? createError.message : 'Không thể tạo doanh nghiệp.'); }
    finally { setIsCreating(false); }
  };
  const updateTenant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!selected) return; const form = new FormData(event.currentTarget);
    try {
      await apiRequest(`/platform/tenants/${selected.id}`, { method: 'PATCH', body: JSON.stringify({ name: form.get('name'), shortName: form.get('shortName'), primaryColor: form.get('primaryColor'), locale: form.get('locale'), timezone: form.get('timezone'), enabledModules: ['core', ...enabled] }) });
      setMessage('Đã cập nhật doanh nghiệp và entitlement phân hệ.'); await loadTenants();
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : 'Không thể cập nhật doanh nghiệp.'); }
  };
  const deleteTenant = async () => {
    if (!selected || deletingId || !window.confirm(`Xóa doanh nghiệp “${selected.name}”? Doanh nghiệp sẽ bị ngừng hoạt động và không còn xuất hiện trong danh sách.`)) return;
    setError(''); setDeletingId(selected.id);
    try {
      await apiRequest(`/platform/tenants/${selected.id}`, { method: 'DELETE' });
      setTenants((current) => current.filter((tenant) => tenant.id !== selected.id));
      setArchivedTenants((current) => [selected, ...current]);
      setSelectedId(''); setInitialAdmin(null); setMessage('Đã xóa doanh nghiệp. Dữ liệu được lưu trữ để đảm bảo an toàn và truy vết.');
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Không thể xóa doanh nghiệp.'); }
    finally { setDeletingId(null); }
  };
  const restoreTenant = async (tenant: Tenant) => {
    if (restoringId || !window.confirm(`Khôi phục doanh nghiệp “${tenant.name}”?`)) return;
    setError(''); setRestoringId(tenant.id);
    try {
      const restored = await apiRequest<Tenant>(`/platform/tenants/${tenant.id}/restore`, { method: 'POST' });
      setArchivedTenants((current) => current.filter((item) => item.id !== tenant.id));
      setTenants((current) => [restored, ...current]); setMessage('Đã khôi phục doanh nghiệp.');
    } catch (restoreError) { setError(restoreError instanceof Error ? restoreError.message : 'Không thể khôi phục doanh nghiệp.'); }
    finally { setRestoringId(null); }
  };
  const permanentlyDeleteTenant = async (tenant: Tenant) => {
    const confirmation = permanentConfirmations[tenant.id] ?? '';
    if (permanentlyDeletingId || (confirmation !== tenant.code && confirmation !== tenant.name) || !window.confirm(`Xóa vĩnh viễn “${tenant.name}”? Toàn bộ dữ liệu doanh nghiệp sẽ không thể khôi phục.`)) return;
    setError(''); setPermanentlyDeletingId(tenant.id);
    try {
      await apiRequest(`/platform/tenants/${tenant.id}/permanent`, { method: 'DELETE', body: JSON.stringify({ confirmation }) });
      setArchivedTenants((current) => current.filter((item) => item.id !== tenant.id));
      setPermanentConfirmations((current) => { const next = { ...current }; delete next[tenant.id]; return next; });
      setMessage('Đã xóa vĩnh viễn doanh nghiệp và dữ liệu liên quan.');
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Không thể xóa vĩnh viễn doanh nghiệp.'); }
    finally { setPermanentlyDeletingId(null); }
  };

  return <>
    <PageHeading eyebrow="Platform administration" title="Quản trị đa doanh nghiệp" description="Tạo và vận hành doanh nghiệp/nhà máy theo mô hình cấu hình chung; mỗi khách hàng chỉ nhận các phân hệ đã được cấp quyền." />
    {message && <Notice tone="success">{message}</Notice>}{error && <Notice tone="error">{error}</Notice>}
    {initialAdmin && <Notice tone="success"><strong>Tài khoản quản trị ban đầu — chỉ hiển thị trong phiên này:</strong> @{initialAdmin.username} · Mật khẩu: <code>{initialAdmin.password}</code>. Hãy chuyển giao an toàn hoặc đặt lại mật khẩu sau khi bàn giao.</Notice>}
    <div className="mt-5 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="grid gap-6"><Card><CardHeader><CardTitle>Doanh nghiệp đang hoạt động</CardTitle></CardHeader><CardContent><div className="grid gap-2">{tenants.map((tenant) => <button type="button" key={tenant.id} onClick={() => { setSelectedId(tenant.id); setEnabled(tenant.enabledModules.filter((item) => item !== 'core')); }} className={`flex items-center gap-3 rounded-lg border p-4 text-left transition ${tenant.id === selectedId ? 'border-primary bg-[#F0F7F0]' : 'border-border hover:bg-muted/40'}`}><Building2 size={19} className="text-primary" /><span className="min-w-0 flex-1"><strong className="block">{tenant.shortName}</strong><small className="text-muted-foreground">{tenant.code} · {tenant.siteCount ?? 0} địa điểm · {tenant.memberCount ?? 0} người dùng</small></span></button>)}</div></CardContent></Card><Card><CardHeader><CardTitle>Doanh nghiệp đã lưu trữ</CardTitle></CardHeader><CardContent>{archivedTenants.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có doanh nghiệp đã lưu trữ.</p> : <div className="grid gap-3">{archivedTenants.map((tenant) => { const confirmation = permanentConfirmations[tenant.id] ?? ''; const isConfirmed = confirmation === tenant.code || confirmation === tenant.name; return <div key={tenant.id} className="rounded-lg border border-border p-3"><strong className="block">{tenant.shortName}</strong><small className="block text-muted-foreground">Mã: {tenant.code} · Tên: {tenant.name}</small><div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" variant="secondary" disabled={restoringId === tenant.id} onClick={() => restoreTenant(tenant)}>{restoringId === tenant.id ? 'Đang khôi phục…' : 'Khôi phục'}</Button></div><label className="mt-4 grid gap-1 text-sm font-bold">Nhập chính xác mã hoặc tên ở trên để xóa vĩnh viễn<Input value={confirmation} onChange={(event) => setPermanentConfirmations((current) => ({ ...current, [tenant.id]: event.target.value }))} placeholder="Mã hoặc tên doanh nghiệp" disabled={permanentlyDeletingId === tenant.id} /></label><Button type="button" size="sm" variant="destructive" className="mt-2" disabled={!isConfirmed || permanentlyDeletingId === tenant.id} onClick={() => permanentlyDeleteTenant(tenant)}><Trash2 size={16} />{permanentlyDeletingId === tenant.id ? 'Đang xóa vĩnh viễn…' : 'Xóa vĩnh viễn'}</Button></div>; })}</div>}</CardContent></Card></div>
      <div className="grid gap-6">
        <Card><CardHeader><CardTitle>Tạo doanh nghiệp mới</CardTitle></CardHeader><CardContent><form className="grid gap-3" onSubmit={createTenant}><div className="grid gap-3 sm:grid-cols-2"><Input name="code" placeholder="Mã doanh nghiệp" required disabled={isCreating} /><Input name="slug" placeholder="Định danh URL, ví dụ nha-may-a" required disabled={isCreating} /><Input name="name" placeholder="Tên doanh nghiệp" required disabled={isCreating} /><Input name="shortName" placeholder="Tên rút gọn" required disabled={isCreating} /></div><p className="text-sm font-bold">Phân hệ khởi tạo</p><ModuleChecklist enabled={enabled} onChange={setEnabled} disabled={isCreating} /><Button type="submit" disabled={isCreating}><Plus size={18} />{isCreating ? 'Đang tạo…' : 'Tạo doanh nghiệp'}</Button></form></CardContent></Card>
        {selected && <Card><CardHeader><CardTitle>Cấu hình: {selected.name}</CardTitle></CardHeader><CardContent><form className="grid gap-4" onSubmit={updateTenant}><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold">Tên doanh nghiệp<Input name="name" defaultValue={selected.name} required /></label><label className="grid gap-2 text-sm font-bold">Tên rút gọn<Input name="shortName" defaultValue={selected.shortName} required /></label><label className="grid gap-2 text-sm font-bold">Màu nhận diện<Input name="primaryColor" defaultValue={selected.primaryColor} required /></label><label className="grid gap-2 text-sm font-bold">Ngôn ngữ<Input name="locale" defaultValue={selected.locale} required /></label><label className="grid gap-2 text-sm font-bold sm:col-span-2">Múi giờ<Input name="timezone" defaultValue={selected.timezone} required /></label></div><p className="text-sm font-bold">Entitlement phân hệ</p><ModuleChecklist enabled={enabled} onChange={setEnabled} /><div className="flex flex-wrap gap-3"><Button type="submit"><Save size={18} />Lưu entitlement</Button><Button type="button" variant="destructive" disabled={deletingId === selected.id} onClick={deleteTenant}><Trash2 size={18} />{deletingId === selected.id ? 'Đang xóa…' : 'Xóa doanh nghiệp'}</Button></div></form></CardContent></Card>}
      </div>
    </div>
  </>;
}
