"use client";

import { useAuth } from "./useAuth";

export function useRole() {
  const { user } = useAuth();
  const role = user?.role || "user";

  return {
    role,
    isSuperAdmin: role === "super_admin",
    isAdmin: role === "admin" || role === "super_admin",
    isUser: role === "user",
    /** Can create/edit/delete content */
    canWrite: role === "admin" || role === "super_admin",
    /** Can manage user access (only super_admin) */
    canManageAccess: role === "super_admin",
    /** Check granular permission */
    hasPermission: (permission: string) => {
      if (role === "super_admin") return true;

      // Fallback untuk backward compatibility jika data permissions tidak ada
      if (user?.permissions === undefined || user?.permissions === null) {
        if (permission.startsWith("bmn.")) {
          if (permission.startsWith("bmn.auction.")) {
            return permission === "bmn.auction.view" && (user?.access_modules?.includes("bmn") || false);
          }

          const isReadPermission = ["bmn.view", "bmn.document.history.view"].includes(permission);
          if (isReadPermission) {
            return user?.access_modules?.includes("bmn") || false;
          }
          return role === "admin" && (user?.access_modules?.includes("bmn") || false);
        }
        return false;
      }

      return user.permissions.includes(permission);
    },
  };
}
