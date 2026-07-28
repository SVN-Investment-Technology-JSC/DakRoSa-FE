import { Building2, LayoutGrid, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { TenantConfigurationSectionProps } from '@/types/platform-tenancy';

export function TenantConfigOverview({
  tenant,
}: TenantConfigurationSectionProps) {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-3">
      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          <Building2 className="text-primary" />
          <div>
            <span className="block text-xs text-muted-foreground">
              Mã doanh nghiệp
            </span>
            <strong>{tenant.code}</strong>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          <Users className="text-primary" />
          <div>
            <span className="block text-xs text-muted-foreground">
              Người dùng
            </span>
            <strong>{tenant.memberCount ?? 0}</strong>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          <LayoutGrid className="text-primary" />
          <div>
            <span className="block text-xs text-muted-foreground">
              Phân hệ được bật
            </span>
            <strong>
              {
                tenant.enabledModules.filter((module) => module !== 'core')
                  .length
              }
            </strong>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
