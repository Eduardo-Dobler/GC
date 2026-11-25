import type { Permission } from '@gc/shared';
import type { ReactNode } from 'react';

interface PermissionGateProps {
  permissions: Permission[];
  requires: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ permissions, requires, children, fallback = null }: PermissionGateProps) {
  return permissions.includes(requires) ? <>{children}</> : <>{fallback}</>;
}
