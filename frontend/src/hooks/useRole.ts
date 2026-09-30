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

      // bmn.asset.force_delete strictly super_admin
      if (permission === "bmn.asset.force_delete") return false;

      // Fallback untuk backward compatibility jika data permissions tidak ada atau kosong []
      if (!user?.permissions || user.permissions.length === 0) {
        if (permission.startsWith("bmn.")) {
          if (permission.startsWith("bmn.auction.")) {
            if (permission === "bmn.auction.view") {
              return user?.access_modules?.includes("bmn") || false;
            }
            return role === "admin" && (user?.access_modules?.includes("bmn") || false);
          }

          const isReadPermission = ["bmn.view", "bmn.document.history.view"].includes(permission);
          if (isReadPermission) {
            return user?.access_modules?.includes("bmn") || false;
          }
          return role === "admin" && (user?.access_modules?.includes("bmn") || false);
        }

        if (permission.startsWith("kepegawaian.")) {
          const isReadPermission = ["kepegawaian.view"].includes(permission);
          if (isReadPermission) {
            return user?.access_modules?.includes("kepegawaian") || false;
          }
          return role === "admin" && (user?.access_modules?.includes("kepegawaian") || false);
        }

        if (permission.startsWith("surat_tugas.")) {
          const isReadPermission = ["surat_tugas.view"].includes(permission);
          const hasModuleAccess =
            (user?.access_modules?.includes("surat_tugas") || false) ||
            (user?.access_modules?.includes("kepegawaian") || false);
          if (isReadPermission) {
            return hasModuleAccess;
          }
          return role === "admin" && hasModuleAccess;
        }

        return false;
      }

      return user.permissions.includes(permission);
    },
  };
}
