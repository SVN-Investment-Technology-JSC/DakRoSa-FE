import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TenantConfigurationSectionProps } from '@/types/platform-tenancy';

export function TenantGeneralSettings({
  tenant,
  disabled = false,
}: TenantConfigurationSectionProps) {
  return (
    <Card id="general" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>Thông tin chung</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="tenant-name">Tên doanh nghiệp</Label>
          <Input id="tenant-name" name="name" defaultValue={tenant.name} required disabled={disabled} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tenant-short-name">Tên rút gọn</Label>
          <Input id="tenant-short-name" name="shortName" defaultValue={tenant.shortName} required disabled={disabled} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tenant-locale">Ngôn ngữ</Label>
          <Input id="tenant-locale" name="locale" defaultValue={tenant.locale} required disabled={disabled} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tenant-timezone">Múi giờ</Label>
          <Input id="tenant-timezone" name="timezone" defaultValue={tenant.timezone} required disabled={disabled} />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label>Định danh hệ thống</Label>
          <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/30 p-3">
            <Badge variant="outline">Mã: {tenant.code}</Badge>
            <Badge variant="outline">URL: /t/{tenant.slug}</Badge>
            <span className="text-xs text-muted-foreground">
              Mã và URL không thay đổi sau khi khởi tạo.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
