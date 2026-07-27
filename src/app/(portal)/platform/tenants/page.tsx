'use client';

import { Building2, Plus, Save } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { PageHeading } from '@/components/page-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Notice } from '@/components/ui/notice';
import { apiRequest } from '@/lib/api';

const modules = [
  ['administration', 'Quản trị doanh nghiệp'], ['e-office', 'E-Office'], ['digital-signature', 'Chữ ký số'], ['organization', 'Cơ cấu tổ chức'], ['hrm', 'HRM'], ['attendance', 'Chấm công'], ['workspace', 'Không gian làm việc'], ['planning', 'Kế hoạch'], ['kpi', 'KPI'], ['project-management', 'Quản lý dự án'], ['internal-administration', 'Hành chính nội bộ'],
] as const;
type Tenant = { id: string; code: string; slug: string; name: string; shortName: string; primaryColor: string; locale: string; timezone: string; enabledModules: string[]; siteCount?: number; memberCount?: number };

function ModuleChecklist({ enabled, onChange }: { enabled: string[]; onChange: (next: string[]) => void }) {
  return <div className="grid gap-2 sm:grid-cols-2">{modules.map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"><input type="checkbox" checked={enabled.includes(key)} onChange={(event) => onChange(event.target.checked ? [...enabled, key] : enabled.filter((item) => item !== key))} /><span>{label}</span></label>)}</div>;
}

export default function PlatformTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [enabled, setEnabled] = useState<string[]>(['administration', 'e-office', 'digital-signature', 'organization']);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const selected = tenants.find((tenant) => tenant.id === selectedId);
  const loadTenants = async () => {
    try { setTenants(await apiRequest<Tenant[]>('/platform/tenants')); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách doanh nghiệp.'); }
  };
  useEffect(() => {
    let active = true;
    apiRequest<Tenant[]>('/platform/tenants')
      .then((items) => { if (active) setTenants(items); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách doanh nghiệp.');
      });
    return () => { active = false; };
  }, []);

  const createTenant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget); setError('');
    try {
      const created = await apiRequest<Tenant>('/platform/tenants', { method: 'POST', body: JSON.stringify({ code: form.get('code'), slug: form.get('slug'), name: form.get('name'), shortName: form.get('shortName'), locale: 'vi-VN', timezone: 'Asia/Ho_Chi_Minh', primaryColor: '#386948', enabledModules: ['core', ...enabled] }) });
      event.currentTarget.reset(); setSelectedId(created.id); setMessage('Đã tạo doanh nghiệp mới và cấp quyền quản trị cho tài khoản hiện tại.'); await loadTenants();
    } catch (createError) { setError(createError instanceof Error ? createError.message : 'Không thể tạo doanh nghiệp.'); }
  };
  const updateTenant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!selected) return; const form = new FormData(event.currentTarget);
    try {
      await apiRequest(`/platform/tenants/${selected.id}`, { method: 'PATCH', body: JSON.stringify({ name: form.get('name'), shortName: form.get('shortName'), primaryColor: form.get('primaryColor'), locale: form.get('locale'), timezone: form.get('timezone'), enabledModules: ['core', ...enabled] }) });
      setMessage('Đã cập nhật doanh nghiệp và entitlement phân hệ.'); await loadTenants();
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : 'Không thể cập nhật doanh nghiệp.'); }
  };

  return <>
    <PageHeading eyebrow="Platform administration" title="Quản trị đa doanh nghiệp" description="Tạo và vận hành doanh nghiệp/nhà máy theo mô hình cấu hình chung; mỗi khách hàng chỉ nhận các phân hệ đã được cấp quyền." />
    {message && <Notice tone="success">{message}</Notice>}{error && <Notice tone="error">{error}</Notice>}
    <div className="mt-5 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card><CardHeader><CardTitle>Doanh nghiệp đã tạo</CardTitle></CardHeader><CardContent><div className="grid gap-2">{tenants.map((tenant) => <button type="button" key={tenant.id} onClick={() => { setSelectedId(tenant.id); setEnabled(tenant.enabledModules.filter((item) => item !== 'core')); }} className={`flex items-center gap-3 rounded-lg border p-4 text-left transition ${tenant.id === selectedId ? 'border-primary bg-[#F0F7F0]' : 'border-border hover:bg-muted/40'}`}><Building2 size={19} className="text-primary" /><span className="min-w-0 flex-1"><strong className="block">{tenant.shortName}</strong><small className="text-muted-foreground">{tenant.code} · {tenant.siteCount ?? 0} địa điểm · {tenant.memberCount ?? 0} người dùng</small></span></button>)}</div></CardContent></Card>
      <div className="grid gap-6">
        <Card><CardHeader><CardTitle>Tạo doanh nghiệp mới</CardTitle></CardHeader><CardContent><form className="grid gap-3" onSubmit={createTenant}><div className="grid gap-3 sm:grid-cols-2"><Input name="code" placeholder="Mã doanh nghiệp" required /><Input name="slug" placeholder="Định danh URL, ví dụ nha-may-a" required /><Input name="name" placeholder="Tên doanh nghiệp" required /><Input name="shortName" placeholder="Tên rút gọn" required /></div><p className="text-sm font-bold">Phân hệ khởi tạo</p><ModuleChecklist enabled={enabled} onChange={setEnabled} /><Button type="submit"><Plus size={18} />Tạo doanh nghiệp</Button></form></CardContent></Card>
        {selected && <Card><CardHeader><CardTitle>Cấu hình: {selected.name}</CardTitle></CardHeader><CardContent><form className="grid gap-4" onSubmit={updateTenant}><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold">Tên doanh nghiệp<Input name="name" defaultValue={selected.name} required /></label><label className="grid gap-2 text-sm font-bold">Tên rút gọn<Input name="shortName" defaultValue={selected.shortName} required /></label><label className="grid gap-2 text-sm font-bold">Màu nhận diện<Input name="primaryColor" defaultValue={selected.primaryColor} required /></label><label className="grid gap-2 text-sm font-bold">Ngôn ngữ<Input name="locale" defaultValue={selected.locale} required /></label><label className="grid gap-2 text-sm font-bold sm:col-span-2">Múi giờ<Input name="timezone" defaultValue={selected.timezone} required /></label></div><p className="text-sm font-bold">Entitlement phân hệ</p><ModuleChecklist enabled={enabled} onChange={setEnabled} /><Button type="submit"><Save size={18} />Lưu entitlement</Button></form></CardContent></Card>}
        {selected && <Card><CardHeader><CardTitle>Bổ nhiệm admin doanh nghiệp</CardTitle></CardHeader><CardContent><form className="grid gap-3" onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); setError(''); try { await apiRequest(`/platform/tenants/${selected.id}/admins`, { method: 'POST', body: JSON.stringify({ username: form.get('username'), displayName: form.get('displayName'), email: form.get('email'), phone: form.get('phone'), password: form.get('password'), joinedAt: new Date().toISOString().slice(0, 10) }) }); event.currentTarget.reset(); setMessage('Đã tạo admin doanh nghiệp. Tài khoản này có thể phân quyền cho người dùng khác nhưng không thể tự hạ quyền quản trị.'); await loadTenants(); } catch (adminError) { setError(adminError instanceof Error ? adminError.message : 'Không thể tạo admin doanh nghiệp.'); } }}><div className="grid gap-3 sm:grid-cols-2"><Input name="displayName" placeholder="Họ và tên" required /><Input name="username" placeholder="Tên đăng nhập" required /><Input name="email" type="email" placeholder="Email" required /><Input name="phone" placeholder="Số điện thoại" required /><Input name="password" type="password" minLength={12} placeholder="Mật khẩu ban đầu (tối thiểu 12 ký tự)" required className="sm:col-span-2" /></div><p className="text-sm leading-6 text-muted-foreground">Role admin là role hệ thống được bảo vệ. Admin doanh nghiệp có thể tạo role nghiệp vụ và gán role cho người dùng khác, nhưng không thể tự xóa hoặc thay đổi role đang cấp quyền cho chính mình.</p><Button type="submit"><Plus size={18} />Tạo admin doanh nghiệp</Button></form></CardContent></Card>}
      </div>
    </div>
  </>;
}
