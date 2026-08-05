'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { PLATFORM_TENANT_MODULE_GROUPS } from '@/lib/platform-tenancy';
import type { ModuleChecklistProps } from '@/types/platform-tenancy';

export function ModuleChecklist({
  enabled,
  onChange,
  disabled = false,
}: ModuleChecklistProps) {
  return (
    <div className="grid gap-5">
      {PLATFORM_TENANT_MODULE_GROUPS.map((group) => (
        <section key={group.key} className="grid gap-2">
          <div>
            <h3 className="text-sm font-semibold">{group.label}</h3>
            <p className="text-xs text-muted-foreground">
              {group.description}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.modules.map(({ key, label, description }) => (
              <label
                key={key}
                className="flex items-start gap-3 rounded-lg border border-border px-3 py-3 text-sm"
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
                <span className="grid gap-0.5">
                  <span className="font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">
                    {description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
