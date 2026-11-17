"use client";

import { usePathname } from "next/navigation";
import { useAuth, type User } from "./useAuth";

const PATH_TO_MODULE: Array<[string, string]> = [
  ["/kepegawaian/surat-tugas", "surat_tugas"],
  ["/kepegawaian", "kepegawaian"],
  ["/surat-tugas", "surat_tugas"],
  ["/surat", "surat"],
  ["/bmn", "bmn"],
  ["/keuangan", "keuangan"],
  ["/dereporting", "dereporting"],
  ["/inventory", "inventory"],
  ["/cms", "cms"],
  ["/drive", "drive"],
];

function detectModuleFromPathname(pathname: string | null): string | undefined {
  if (!pathname) return undefined;
  const match = PATH_TO_MODULE.find(([prefix]) => pathname.startsWith(prefix));
  return match?.[1];
}

export function resolveModuleRole(user: User | null | undefined, module?: string): string {
  const rawGlobal = user?.role || "user";
  if (rawGlobal === "super_admin") return "super_admin";

  const fallbackGlobal = rawGlobal === "pegawai" ? "user" : rawGlobal;
  if (!module) return fallbackGlobal;

  const accessModules = Array.isArray(user?.access_modules) ? user.access_modules : [];
  const allowedModules = module === "surat_tugas" ? ["surat_tugas", "kepegawaian"] : [module];
  if (!allowedModules.some((m) => accessModules.includes(m))) {
    return "user";
  }

  const moduleRoles = user?.module_roles;
  if (moduleRoles && typeof moduleRoles === "object" && !Array.isArray(moduleRoles)) {
    const candidates =
      module === "surat_tugas" ? ["surat_tugas", "kepegawaian", "surat-tugas"] : [module];
    for (const key of candidates) {
      const modRole = moduleRoles[key];
      if (modRole === "admin" || modRole === "user") {
        return modRole;
      }
    }
    if (Object.values(moduleRoles).some((r) => r === "admin" || r === "user")) {
      return "user";
    }
  }

  return fallbackGlobal;
}

export function useRole(moduleScope?: string) {
  const { user } = useAuth();
  const pathname = usePathname();
  const activeModule = moduleScope ?? detectModuleFromPathname(pathname);
  const role = resolveModuleRole(user, activeModule);

  return {
    role,
    isSuperAdmin: user?.role === "super_admin",
    isAdmin: role === "admin" || role === "super_admin",
    isUser: role === "user",
    /** Can create/edit/delete content in the resolved module */
    canWrite: role === "admin" || role === "super_admin",
    /** Can manage user access (only super_admin) */
    canManageAccess: user?.role === "super_admin",
    /** Check granular permission (scoped to the permission's module role) */
    hasPermission: (permission: string) => {
      if (user?.role === "super_admin") return true;
      if (["bmn.asset.force_delete", "bmn.manage", "surat.manage", "kepegawaian.manage"].includes(permission)) return false;

      if (!user?.permissions || user.permissions.length === 0) {
        const permPrefix = permission.split(".")[0];
        const permRole = resolveModuleRole(user, permPrefix);

        if (permission.startsWith("bmn.")) {
          if (permission === "bmn.view") {
            return user?.access_modules?.includes("bmn") || false;
          }
          return permRole === "admin" && (user?.access_modules?.includes("bmn") || false);
        }

        if (permission.startsWith("kepegawaian.")) {
          const isReadPermission = ["kepegawaian.view"].includes(permission);
          if (isReadPermission) {
            return user?.access_modules?.includes("kepegawaian") || false;
          }
          return permRole === "admin" && (user?.access_modules?.includes("kepegawaian") || false);
        }

        if (permission.startsWith("surat_tugas.")) {
          const isReadPermission = ["surat_tugas.view"].includes(permission);
          const hasModuleAccess =
            (user?.access_modules?.includes("surat_tugas") || false) ||
            (user?.access_modules?.includes("kepegawaian") || false);
          if (isReadPermission) {
            return hasModuleAccess;
          }
          return permRole === "admin" && hasModuleAccess;
        }

        if (permission.startsWith("surat.")) {
          if (!user?.access_modules?.includes("surat")) return false;
          if (permRole === "admin") return true;
          return !permission.startsWith("surat.masuk.") && permission !== "surat.export";
        }

        return false;
      }

      return user.permissions.includes(permission);
    },
  };
}
