import { ImageIcon, LayoutGrid, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TenantConfigNavigation() {
  return (
    <Card className="h-fit xl:sticky xl:top-24">
      <CardHeader>
        <CardTitle className="text-base">Nhóm cấu hình</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-1">
        <Button asChild type="button" variant="ghost" className="justify-start">
          <a href="#general">
            <Settings2 />
            Thông tin chung
          </a>
        </Button>
        <Button asChild type="button" variant="ghost" className="justify-start">
          <a href="#branding">
            <ImageIcon />
            Nhận diện
          </a>
        </Button>
        <Button asChild type="button" variant="ghost" className="justify-start">
          <a href="#modules">
            <LayoutGrid />
            Phân hệ
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
