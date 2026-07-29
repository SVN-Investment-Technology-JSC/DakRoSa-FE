import { Archive } from 'lucide-react';
import { Popconfirm } from 'antd';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TenantDangerZoneProps } from '@/types/platform-tenancy';

export function TenantDangerZone({
  tenant,
  isArchiving,
  onArchive,
}: TenantDangerZoneProps) {
  return (
    <Card className="border-destructive/25">
      <CardHeader>
        <CardTitle className="text-destructive">Vùng nguy hiểm</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <strong>Lưu trữ doanh nghiệp</strong>
          <p className="mt-1 text-sm text-muted-foreground">
            Người dùng doanh nghiệp sẽ không thể tiếp tục hoạt động cho đến khi
            tenant được khôi phục.
          </p>
        </div>
        <Popconfirm
          title="Lưu trữ doanh nghiệp?"
          description={`Xác nhận lưu trữ ${tenant.name}.`}
          okText="Lưu trữ"
          cancelText="Hủy"
          okButtonProps={{ danger: true }}
          onConfirm={onArchive}
        >
          <Button type="button" variant="destructive" disabled={isArchiving}>
            <Archive />
            {isArchiving ? 'Đang lưu trữ…' : 'Lưu trữ doanh nghiệp'}
          </Button>
        </Popconfirm>
      </CardContent>
    </Card>
  );
}
