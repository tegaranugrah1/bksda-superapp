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
  };
}
