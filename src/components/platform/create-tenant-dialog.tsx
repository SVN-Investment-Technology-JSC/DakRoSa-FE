'use client';

import { Plus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { ModuleChecklist } from '@/components/platform/module-checklist';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DEFAULT_PLATFORM_TENANT_MODULES } from '@/lib/platform-tenancy';
import { platformTenantsService } from '@/services/platform-tenants.service';
import { useAppDispatch } from '@/store/hooks';
import {
  createPlatformTenant,
  tenantUpserted,
} from '@/store/platform-tenants.slice';
import type { CreateTenantDialogProps } from '@/types/platform-tenancy';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Không thể tạo doanh nghiệp.';
}

export function CreateTenantDialog({ onCreated }: CreateTenantDialogProps) {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [enabledModules, setEnabledModules] = useState<string[]>([
    ...DEFAULT_PLATFORM_TENANT_MODULES,
  ]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCreating) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const logo = form.get('logo');
    const logoFile = logo instanceof File && logo.size > 0 ? logo : null;

    setIsCreating(true);
    try {
      const created = await dispatch(
        createPlatformTenant({
          code: String(form.get('code') ?? ''),
          slug: String(form.get('slug') ?? ''),
          name: String(form.get('name') ?? ''),
          shortName: String(form.get('shortName') ?? ''),
          locale: 'vi-VN',
          timezone: 'Asia/Ho_Chi_Minh',
          primaryColor: String(form.get('primaryColor') ?? '#386948'),
          enabledModules: ['core', ...enabledModules],
        }),
      ).unwrap();

      let logoUploadFailed = false;
      if (logoFile) {
        try {
          const brandedTenant = await platformTenantsService.uploadLogo(
            created.id,
            logoFile,
          );
          dispatch(tenantUpserted(brandedTenant));
        } catch {
          logoUploadFailed = true;
        }
      }

      onCreated(created.initialAdmin);
      setOpen(false);
      setEnabledModules([...DEFAULT_PLATFORM_TENANT_MODULES]);
      formElement.reset();

      if (logoUploadFailed) {
        toast.warning(
          'Đã tạo doanh nghiệp nhưng chưa tải được logo. Bạn có thể tải lại trong trang cấu hình.',
        );
      } else {
        toast.success('Đã tạo doanh nghiệp thành công.');
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus />
          Tạo doanh nghiệp mới
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Tạo doanh nghiệp mới</DialogTitle>
            <DialogDescription>
              Khởi tạo tenant, tài khoản quản trị ban đầu và nhận diện cơ bản.
              Các cấu hình nâng cao có thể bổ sung sau.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="tenant-code">Mã doanh nghiệp</Label>
              <Input id="tenant-code" name="code" placeholder="VD: SAVINA" required disabled={isCreating} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tenant-slug">Định danh URL</Label>
              <Input id="tenant-slug" name="slug" placeholder="VD: savina" required disabled={isCreating} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tenant-name">Tên doanh nghiệp</Label>
              <Input id="tenant-name" name="name" required disabled={isCreating} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tenant-short-name">Tên rút gọn</Label>
              <Input id="tenant-short-name" name="shortName" required disabled={isCreating} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tenant-color">Màu nhận diện</Label>
              <Input id="tenant-color" name="primaryColor" type="color" defaultValue="#386948" required disabled={isCreating} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tenant-logo">Logo (PNG/JPG/WebP, tối đa 2 MB)</Label>
              <Input id="tenant-logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" disabled={isCreating} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Phân hệ khởi tạo</Label>
            <ModuleChecklist enabled={enabledModules} onChange={setEnabledModules} disabled={isCreating} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isCreating} onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isCreating}>
              <Plus />
              {isCreating ? 'Đang tạo…' : 'Tạo doanh nghiệp'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
