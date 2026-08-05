import { User } from '@/types/auth';
import { useAuth } from '@/features/auth/AuthProvider';

/**
 * Checks if the user is a superadmin.
 * Do not hardcode specific user names, NIP, or emails to grant admin access.
 */
export function isSuperAdmin(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'superadmin' || user.role === 'super_admin';
}

/**
 * Checks if the user is an admin or superadmin.
 */
export function isAdmin(user: User | null): boolean {
  if (!user) return false;
  return isSuperAdmin(user) || user.role === 'admin';
}

/**
 * Checks if the user has access to a specific module (e.g. 'bmn', 'kepegawaian').
 * Superadmins are granted access to all modules automatically.
 * Fails closed if the module data is missing.
 */
export function hasModule(user: User | null, module: string): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  return Array.isArray(user.access_modules) && user.access_modules.includes(module);
}

/**
 * Checks if the user has a specific permission string.
 * Superadmins are granted all actions automatically.
 * Fails closed if the permission data is missing.
 */
export function can(user: User | null, permission: string): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  return Array.isArray(user.permissions) && user.permissions.includes(permission);
}

/**
 * React hook that binds permission helper functions to the active authentication session.
 */
export function usePermissions() {
  const { user } = useAuth();

  return {
    isSuperAdmin: () => isSuperAdmin(user),
    isAdmin: () => isAdmin(user),
    hasModule: (module: string) => hasModule(user, module),
    can: (permission: string) => can(user, permission),
    user,
  };
}
