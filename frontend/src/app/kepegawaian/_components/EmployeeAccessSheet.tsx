"use client";

import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Loader2, AlertCircle, Check } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const accessSchema = z.object({
  role: z.enum(["super_admin", "admin", "user", "pegawai"]),
  is_active: z.boolean(),
  access_modules: z.array(z.string()),
  module_roles: z.record(z.string(), z.enum(["user", "admin"])).optional(),
  permissions: z.array(z.string()).optional(),
  password: z.string().min(8, "Password minimal 8 karakter").optional().or(z.literal("")),
});

type AccessFormValues = z.infer<typeof accessSchema>;

const AVAILABLE_MODULES = [
  { id: "kepegawaian", label: "Kepegawaian", description: "Manajemen SDM & Data Pegawai" },
  { id: "bmn", label: "BMN & Aset", description: "Barang Milik Negara & Inventaris Aset" },
  { id: "inventory", label: "Inventory", description: "Stok Barang & Logistik Persediaan" },
  { id: "dereporting", label: "D-Reporting", description: "Pelaporan Kejadian Digital Elektronik" },
  { id: "drive", label: "BKSDA Drive", description: "Admin Penyimpanan Cloud & Manajemen Berkas" },
  { id: "cms", label: "CMS Panel", description: "Manajemen Konten Website & Portal Publik" },
  { id: "surat", label: "Persuratan & Disposisi", description: "Pengelolaan Surat Masuk & Keluar" },
  { id: "keuangan", label: "Keuangan", description: "Visum SPD, SPJ, & Pembayaran" },
];

interface EmployeeAccessSheetProps {
  employee: { id: string; nip: string; nama_lengkap: string } | null;
  open: boolean;
  returnFocusRef?: React.RefObject<HTMLButtonElement | null>;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeAccessSheet({ employee, open, onOpenChange, returnFocusRef }: EmployeeAccessSheetProps) {
  const queryClient = useQueryClient();

  const form = useForm<AccessFormValues>({
    resolver: zodResolver(accessSchema),
    defaultValues: { role: "user", is_active: false, access_modules: [], module_roles: {}, permissions: [], password: "" },
  });

  const selectedRole = useWatch({ control: form.control, name: "role" });
  const accessModules = useWatch({ control: form.control, name: "access_modules", defaultValue: [] });
  const moduleRoles = useWatch({ control: form.control, name: "module_roles", defaultValue: {} }) || {};

  const { data: currentAccess, isLoading, isError, refetch } = useQuery({
    queryKey: ["employee-access", employee?.id],
    queryFn: async () => { const { data } = await api.get(`/kepegawaian/employees/${employee?.id}/access`); return data.data; },
    enabled: !!employee && open,
    staleTime: 0,
  });

  const lastSyncedId = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !employee) {
      lastSyncedId.current = null;
      return;
    }

    // Already synced for this employee
    if (lastSyncedId.current === employee.id) return;

    if (currentAccess) {
      const resolvedRole = (currentAccess.role === "pegawai" ? "user" : currentAccess.role) as "super_admin" | "admin" | "user" | "pegawai";
      const modules = Array.isArray(currentAccess.access_modules) ? currentAccess.access_modules : [];
      const incomingModuleRoles =
        currentAccess.module_roles && typeof currentAccess.module_roles === "object" && !Array.isArray(currentAccess.module_roles)
          ? (currentAccess.module_roles as Record<string, "user" | "admin">)
          : {};
      const hydratedModuleRoles: Record<string, "user" | "admin"> = {};
      const defaultModRole: "user" | "admin" = resolvedRole === "admin" ? "admin" : "user";
      for (const modId of modules) {
        const raw = incomingModuleRoles[modId];
        hydratedModuleRoles[modId] = raw === "admin" || raw === "user" ? raw : defaultModRole;
      }
      form.reset({
        role: resolvedRole || "user",
        is_active: currentAccess.is_active === true,
        access_modules: modules,
        module_roles: hydratedModuleRoles,
        permissions: [],
        password: "",
      });
      lastSyncedId.current = employee.id;
    } else if (!isLoading) {
      // No access data (new account)
      form.reset({ role: "user", is_active: false, access_modules: [], module_roles: {}, permissions: [], password: "" });
      lastSyncedId.current = employee.id;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccess, open, isLoading, employee?.id]);

  const mutation = useMutation({
    mutationFn: async (values: AccessFormValues) => {
      const sanitizedModuleRoles: Record<string, "user" | "admin"> = {};
      if (values.role !== "super_admin") {
        const fallbackRole: "user" | "admin" = values.role === "admin" ? "admin" : "user";
        for (const modId of values.access_modules) {
          const raw = values.module_roles?.[modId];
          sanitizedModuleRoles[modId] = raw === "admin" || raw === "user" ? raw : fallbackRole;
        }
      }
      const modValues = Object.values(sanitizedModuleRoles);
      const derivedRole =
        values.role === "super_admin"
          ? "super_admin"
          : modValues.length > 0 && modValues.every((r) => r === "admin")
          ? "admin"
          : "user";

      // Don't send password field if empty (avoid validation issues)
      const payload: Record<string, unknown> = {
        role: derivedRole,
        is_active: values.is_active,
        access_modules: values.access_modules,
        ...(values.role !== "super_admin" ? { module_roles: sanitizedModuleRoles } : {}),
        permissions: [],
      };
      if (values.password && values.password.length > 0) {
        payload.password = values.password;
      }
      const { data } = await api.put(`/kepegawaian/employees/${employee?.id}/access`, payload);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Hak akses berhasil diperbarui");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee-access", employee?.id] });
      onOpenChange(false);
    },
    onError: (error: unknown) => { const err = error as { response?: { data?: { message?: string } } }; toast.error(err.response?.data?.message || "Gagal memperbarui hak akses"); },
  });

  function onSubmit(values: AccessFormValues) { mutation.mutate(values); }

  const isNewAccount = !currentAccess;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onCloseAutoFocus={(event) => {
          if (!returnFocusRef?.current) return;
          event.preventDefault();
          returnFocusRef.current.focus();
        }}
        data-module="kepegawaian"
        className="kpg-ui sm:max-w-[820px] p-5 gap-3 max-h-[94vh] overflow-y-auto sm:overflow-visible"
      >
        <DialogHeader className="space-y-0">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <div className="w-7 h-7 rounded-lg bg-[var(--ds-accent-solid)] flex items-center justify-center text-[var(--ds-accent-on-solid)]">
              <Shield className="w-4 h-4" />
            </div>
            Manajemen Hak Akses
          </DialogTitle>
          <DialogDescription className="sr-only">Atur role dan modul akses pegawai</DialogDescription>
        </DialogHeader>

        {/* Employee Info Strip */}
        {employee && (
          <div className="px-3 py-2 bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[var(--ds-accent-soft)] flex items-center justify-center text-[var(--ds-accent-fg)] text-xs font-bold shrink-0">
                {employee.nama_lengkap.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-[var(--ds-fg)] leading-tight truncate">{employee.nama_lengkap}</p>
                <p className="text-xs text-[var(--ds-fg-muted)] font-mono truncate">
                  {employee.nip.toUpperCase().startsWith("MMP-") ? "Username Portal: " : "NIP: "}
                  <span className="font-semibold text-[var(--ds-fg)]">{employee.nip}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-[var(--ds-accent-fg)]" />
            <p className="text-sm font-medium text-[var(--ds-fg-muted)]">Memuat data akses...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-[var(--ds-status-danger-fg)] bg-[var(--ds-status-danger-bg)] rounded-xl border border-[var(--ds-status-danger-border)]">
            <AlertCircle className="w-8 h-8 opacity-50" />
            <p className="text-sm font-semibold">Gagal memuat data akses</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Coba Lagi</Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5">
              {/* Role & Activation Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs font-bold uppercase tracking-wide text-[var(--ds-fg-muted)]">Peran Sistem (Role)</FormLabel>
                      <FormControl>
                        <select
                          value={field.value}
                          onChange={(e) => {
                            const nextRole = e.target.value as "user" | "admin" | "super_admin";
                            field.onChange(nextRole);
                            if (nextRole !== "super_admin") {
                              const currentMods = form.getValues("access_modules") || [];
                              const batchRoles: Record<string, "user" | "admin"> = {};
                              for (const modId of currentMods) {
                                batchRoles[modId] = nextRole;
                              }
                              form.setValue("module_roles", batchRoles, { shouldDirty: true });
                            }
                          }}
                          className="w-full h-9 px-3 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-soft-border)] focus:border-[var(--ds-accent-soft-border)]"
                        >
                          <option value="user">User (Atur Per Modul / Pegawai)</option>
                          <option value="admin">Admin (Default Semua Modul Admin)</option>
                          <option value="super_admin">Super Admin (Akses Penuh)</option>
                        </select>
                      </FormControl>
                      <p className="text-[11px] leading-snug text-[var(--ds-fg-muted)]">
                        {field.value === "super_admin"
                          ? "Akses penuh ke seluruh modul & pengaturan."
                          : "Pilih User/Admin pada masing-masing modul di bawah."}
                      </p>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField control={form.control} name="is_active" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wide text-[var(--ds-fg-muted)] block">Status Akun</span>
                    <label className="flex items-start gap-2.5 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 cursor-pointer">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={event => field.onChange(event.target.checked)}
                          className="mt-0.5 shrink-0"
                        />
                      </FormControl>
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-[var(--ds-fg)] block leading-tight">Aktifkan akun akses aplikasi</span>
                        <span className="text-[11px] leading-snug text-[var(--ds-fg-muted)] block mt-0.5">Akun nonaktif tidak dapat login & sesi akses dicabut.</span>
                      </div>
                    </label>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Module Access */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wide text-[var(--ds-fg-muted)]">Akses Modul</label>
                  <Badge variant="outline" className="text-xs font-bold">{accessModules.length} Terpilih</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AVAILABLE_MODULES.map((module) => {
                    const isSelected = accessModules.includes(module.id);
                    const currentModRole = moduleRoles[module.id] || (selectedRole === "admin" ? "admin" : "user");
                    return (
                      <div
                        key={module.id}
                        className={cn(
                          "flex flex-col justify-center gap-1 rounded-xl border px-3 py-2 transition-colors cursor-pointer select-none",
                          isSelected ? "bg-[var(--ds-accent-soft)] border-[var(--ds-accent-soft-border)]" : "bg-[var(--ds-surface)] border-[var(--ds-border-subtle)] hover:border-[var(--ds-border-subtle)]"
                        )}
                        onClick={() => {
                          const current = form.getValues("access_modules") || [];
                          const currentRoles = { ...(form.getValues("module_roles") || {}) };
                          const updated = isSelected
                            ? current.filter((v) => v !== module.id)
                            : [...current, module.id];
                          if (isSelected) {
                            delete currentRoles[module.id];
                          } else {
                            currentRoles[module.id] = selectedRole === "admin" ? "admin" : "user";
                          }
                          form.setValue("access_modules", updated, { shouldValidate: true });
                          form.setValue("module_roles", currentRoles, { shouldDirty: true });
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={cn(
                            "w-4.5 h-4.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                            isSelected ? "bg-[var(--ds-accent-solid)] border-[var(--ds-accent-soft-border)]" : "border-[var(--ds-border-subtle)]"
                          )}>
                            {isSelected && <Check className="w-3 h-3 text-[var(--ds-accent-on-solid)]" />}
                          </div>
                          <p className={cn("text-sm font-semibold leading-tight truncate flex-1", isSelected ? "text-[var(--ds-accent-fg)]" : "text-[var(--ds-fg)]")}>
                            {module.label}
                          </p>
                          {isSelected && selectedRole !== "super_admin" && (
                            <div
                              className="inline-flex items-center rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] p-0.5 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                              role="group"
                              aria-label={`Peran modul ${module.label}`}
                            >
                              {(["user", "admin"] as const).map((modRole) => {
                                const active = currentModRole === modRole;
                                return (
                                  <button
                                    key={modRole}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() =>
                                      form.setValue(`module_roles.${module.id}`, modRole, {
                                        shouldDirty: true,
                                      })
                                    }
                                    className={cn(
                                      "px-2.5 py-0.5 text-[11px] font-bold rounded-md transition-colors cursor-pointer",
                                      active
                                        ? modRole === "admin"
                                          ? "bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] shadow-xs"
                                          : "bg-[var(--ds-fg)] text-[var(--ds-surface)] shadow-xs"
                                        : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
                                    )}
                                  >
                                    {modRole === "admin" ? "Admin" : "User"}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--ds-fg-muted)] leading-snug pl-7 truncate">{module.description}</p>
                      </div>
                    );
                  })}
                </div>
                {form.formState.errors.access_modules && (
                  <p className="text-xs text-[var(--ds-status-danger-fg)]">{form.formState.errors.access_modules.message}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-3 border-t">
                <Button type="button" variant="outline" className="flex-1 h-9 rounded-xl" onClick={() => onOpenChange(false)}>Batal</Button>
                <Button type="submit" className="flex-1 h-9 rounded-xl bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] font-bold" disabled={mutation.isPending}>
                  {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                  {isNewAccount ? "Terbitkan Akses" : "Simpan"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
