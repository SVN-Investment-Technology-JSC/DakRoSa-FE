'use client';

import { Building2, Plus, Save } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { PageHeading } from '@/components/page-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Notice } from '@/components/ui/notice';
import { apiRequest } from '@/lib/api';

type Tenant = {
  id: string;
  name: string;
  shortName: string;
  code: string;
  slug: string;
  primaryColor: string;
  locale: string;
  timezone: string;
};

type Site = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  isActive: boolean;
};

type Bootstrap = { tenant: Tenant; sites: Site[] };

export default function TenantSettingsPage() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await apiRequest<Bootstrap>('/tenancy/settings'));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải cấu hình.');
    }
  }, []);

  useEffect(() => void load(), [load]);

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await apiRequest('/tenancy/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.get('name'),
          shortName: form.get('shortName'),
          primaryColor: form.get('primaryColor'),
          locale: form.get('locale'),
          timezone: form.get('timezone'),
        }),
      });
      setMessage('Đã lưu cấu hình doanh nghiệp.');
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu cấu hình.');
    } finally {
      setSaving(false);
    }
  };

  const createSite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    try {
      await apiRequest('/tenancy/sites', {
        method: 'POST',
        body: JSON.stringify({
          code: form.get('code'),
          name: form.get('name'),
          address: form.get('address') || undefined,
        }),
      });
      event.currentTarget.reset();
      setMessage('Đã thêm nhà máy/địa điểm.');
      await load();
    } catch (siteError) {
      setError(siteError instanceof Error ? siteError.message : 'Không thể thêm địa điểm.');
    }
  };

  const toggleSite = async (site: Site) => {
    try {
      await apiRequest(`/tenancy/sites/${site.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !site.isActive }),
      });
      await load();
    } catch (siteError) {
      setError(siteError instanceof Error ? siteError.message : 'Không thể cập nhật địa điểm.');
    }
  };

  if (!data) return <p className="text-sm text-muted-foreground">Đang tải cấu hình…</p>;

  return (
    <>
      <PageHeading
        eyebrow="Quản trị doanh nghiệp"
        title="Cấu hình doanh nghiệp"
        description="Thiết lập nhận diện, ngôn ngữ vận hành và danh sách nhà máy/địa điểm trực thuộc."
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <Card>
          <CardHeader><CardTitle>Thông tin nhận diện</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={saveSettings}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold">Tên doanh nghiệp<Input name="name" defaultValue={data.tenant.name} required /></label>
                <label className="grid gap-2 text-sm font-bold">Tên rút gọn<Input name="shortName" defaultValue={data.tenant.shortName} required /></label>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-2 text-sm font-bold">Màu nhận diện<Input name="primaryColor" defaultValue={data.tenant.primaryColor} pattern="^#[0-9A-Fa-f]{6}$" required /></label>
                <label className="grid gap-2 text-sm font-bold">Ngôn ngữ<Input name="locale" defaultValue={data.tenant.locale} required /></label>
                <label className="grid gap-2 text-sm font-bold">Múi giờ<Input name="timezone" defaultValue={data.tenant.timezone} required /></label>
              </div>
              <div className="flex justify-end"><Button type="submit" disabled={saving}><Save size={18} />{saving ? 'Đang lưu…' : 'Lưu cấu hình'}</Button></div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Thông tin hệ thống</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div><span className="text-muted-foreground">Mã doanh nghiệp</span><strong className="block">{data.tenant.code}</strong></div>
            <div><span className="text-muted-foreground">Định danh đường dẫn</span><strong className="block">{data.tenant.slug}</strong></div>
            <p className="rounded-lg bg-[#F0F5EE] p-4 leading-6 text-muted-foreground">Các phân hệ được bật/tắt tại khu vực Quản trị nền tảng để tránh thay đổi ngoài thẩm quyền doanh nghiệp.</p>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>Nhà máy và địa điểm vận hành</CardTitle></CardHeader>
        <CardContent>
          {message && <Notice tone="success">{message}</Notice>}
          {error && <Notice tone="error">{error}</Notice>}
          <form className="mt-4 grid gap-3 md:grid-cols-[150px_1fr_1fr_auto]" onSubmit={createSite}>
            <Input name="code" placeholder="Mã địa điểm" required />
            <Input name="name" placeholder="Tên nhà máy/địa điểm" required />
            <Input name="address" placeholder="Địa chỉ (không bắt buộc)" />
            <Button type="submit" variant="secondary"><Plus size={18} />Thêm</Button>
          </form>
          <div className="mt-5 grid gap-3">
            {data.sites.map((site) => (
              <div key={site.id} className="flex items-center gap-3 rounded-lg border border-border p-4">
                <Building2 size={19} className="text-primary" />
                <div className="min-w-0 flex-1"><strong>{site.name}</strong><span className="ml-2 text-sm text-muted-foreground">{site.code}{site.address ? ` · ${site.address}` : ''}</span></div>
                <Button size="sm" variant={site.isActive ? 'secondary' : 'ghost'} onClick={() => void toggleSite(site)}>{site.isActive ? 'Đang hoạt động' : 'Đã ngừng'}</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
