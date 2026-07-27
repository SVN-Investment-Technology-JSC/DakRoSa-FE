'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { hasPermission } from '@/lib/permissions';
import { PermissionKey } from '@/lib/navigation';

interface ProtectedProps {
  permission: PermissionKey | PermissionKey[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function Protected({ permission, fallback = null, children }: ProtectedProps) {
  const { user } = useAuth();
  
  const isAllowed = Array.isArray(permission)
    ? permission.some(p => hasPermission(user, p))
    : hasPermission(user, permission);
    
  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
