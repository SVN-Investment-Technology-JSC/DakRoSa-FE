'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { PLATFORM_TENANT_MODULES } from '@/lib/platform-tenancy';
import type { ModuleChecklistProps } from '@/types/platform-tenancy';

export function ModuleChecklist({
  enabled,
  onChange,
  disabled = false,
}: ModuleChecklistProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {PLATFORM_TENANT_MODULES.map(([key, label]) => (
        <label
          key={key}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
        >
          <Checkbox
            checked={enabled.includes(key)}
            disabled={disabled}
            onCheckedChange={(checked) =>
              onChange(
                checked === true
                  ? [...enabled, key]
                  : enabled.filter((item) => item !== key),
              )
            }
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}
