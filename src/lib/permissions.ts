import { navigationConfig, PermissionKey, tenantPath } from './navigation';
import type { AuthUser } from '@/types/auth';

export function hasPermission(user: AuthUser | null, permission: PermissionKey): boolean {
  if (!user) return false;
  return user.isPlatformAdmin || user.roleCodes.includes('admin') || user.permissions.includes(permission);
}

export function firstPermittedPath(user: AuthUser | null): string {
  const item = navigationConfig.find((candidate) =>
    hasPermission(user, candidate.viewPermission),
  );
  if (!item || !user) return '/forbidden';
  return tenantPath(user.activeTenant.slug, item.href);
}

export function normalizeModuleSelection(
  selected: ReadonlySet<string>,
  viewPermission: string,
  actionPermission: string,
  checked: boolean,
): Set<string> {
  const next = new Set(selected);
  if (actionPermission === viewPermission) {
    if (checked) next.add(viewPermission);
    else {
      const modulePrefix = viewPermission.split('.')[0];
      for (const key of next) if (key.startsWith(`${modulePrefix}.`)) next.delete(key);
    }
    return next;
  }
  if (checked) {
    next.add(viewPermission);
    next.add(actionPermission);
  } else {
    next.delete(actionPermission);
  }
  return next;
}
