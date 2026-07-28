import { ModuleChecklist } from '@/components/platform/module-checklist';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TenantModuleSettingsProps } from '@/types/platform-tenancy';

export function TenantModuleSettings({
  enabledModules,
  onChange,
  disabled = false,
}: TenantModuleSettingsProps) {
  return (
    <Card id="modules" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>Phân hệ được cấp quyền</CardTitle>
      </CardHeader>
      <CardContent>
        <ModuleChecklist
          enabled={enabledModules}
          onChange={onChange}
          disabled={disabled}
        />
      </CardContent>
    </Card>
  );
}
