import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TenantBrandingSettingsProps } from '@/types/platform-tenancy';

export function TenantBrandingSettings({
  tenant,
  removeLogo,
  onRemoveLogoChange,
  disabled = false,
}: TenantBrandingSettingsProps) {
  return (
    <Card id="branding" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>Nhận diện doanh nghiệp</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center">
          <span
            className="grid size-20 shrink-0 place-items-center rounded-xl text-xl font-black text-white"
            style={{ backgroundColor: tenant.primaryColor }}
          >
            {tenant.shortName.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <strong className="block">{tenant.shortName}</strong>
            <p className="mt-1 text-sm text-muted-foreground">
              Logo hiện tại: {tenant.logoUrl ? 'Đã thiết lập' : 'Chưa có'}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="tenant-primary-color">Màu chủ đạo</Label>
            <Input
              id="tenant-primary-color"
              name="primaryColor"
              type="color"
              defaultValue={tenant.primaryColor}
              required
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tenant-logo">
              Logo mới (PNG/JPG/WebP, tối đa 2 MB)
            </Label>
            <Input
              id="tenant-logo"
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={disabled}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium">
          <Checkbox
            checked={removeLogo}
            onCheckedChange={(checked) => onRemoveLogoChange(checked === true)}
            disabled={!tenant.logoUrl || disabled}
          />
          Xóa logo hiện tại và sử dụng chữ viết tắt
        </label>
      </CardContent>
    </Card>
  );
}
