'use client';

import { Building2, Plus, Save } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeading } from '@/components/page-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { tenancyService } from '@/services/tenancy.service';
import type { Site, TenancyBootstrap } from '@/types/tenancy';

export default function TenantSettingsPage() {
  const [data, setData] = useState<TenancyBootstrap | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    try {
      setData(await tenancyService.getSettings());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải cấu hình.');
    }
  };

  useEffect(() => {
    let active = true;
    tenancyService.getSettings()
      .then((settings) => { if (active) setData(settings); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Không thể tải cấu hình.');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => { if (message) toast.success(message); }, [message]);
  useEffect(() => { if (error) toast.error(error); }, [error]);

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await tenancyService.updateSettings({
        name: String(form.get('name') ?? ''),
        shortName: String(form.get('shortName') ?? ''),
        primaryColor: String(form.get('primaryColor') ?? ''),
        locale: String(form.get('locale') ?? ''),
        timezone: String(form.get('timezone') ?? ''),
      });
      setMessage('Đã lưu cấu hình doanh nghiệp.');
      await loadSettings();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu cấu hình.');
    } finally {
      setSaving(false);
    }
  };

  const createSite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError('');
    try {
      await tenancyService.createSite({
        code: String(form.get('code') ?? ''),
        name: String(form.get('name') ?? ''),
        address: String(form.get('address') ?? '') || undefined,
      });
      formElement.reset();
      setMessage('Đã thêm nhà máy/địa điểm.');
      await loadSettings();
    } catch (siteError) {
      setError(siteError instanceof Error ? siteError.message : 'Không thể thêm địa điểm.');
    }
  };

  const toggleSite = async (site: Site) => {
    try {
      await tenancyService.setSiteActive(site.id, !site.isActive);
      await loadSettings();
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
