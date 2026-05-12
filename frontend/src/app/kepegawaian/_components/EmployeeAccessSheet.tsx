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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield, KeyRound, Loader2, AlertCircle, Info, Check } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const accessSchema = z.object({
  role: z.enum(["super_admin", "admin", "user"]),
  access_modules: z.array(z.string()),
  password: z.string().min(8, "Password minimal 8 karakter").optional().or(z.literal("")),
});

type AccessFormValues = z.infer<typeof accessSchema>;

const AVAILABLE_MODULES = [
  { id: "kepegawaian", label: "Kepegawaian", description: "Manajemen SDM & Data Pegawai" },
  { id: "bmn", label: "BMN & Aset", description: "Barang Milik Negara & Inventaris Aset" },
  { id: "inventory", label: "Inventory", description: "Stok Barang & Logistik Persediaan" },
  { id: "dereporting", label: "D-Reporting", description: "Pelaporan Kejadian Digital Elektronik" },
  { id: "cms", label: "CMS Panel", description: "Manajemen Konten Website & Portal Publik" },
];

interface EmployeeAccessSheetProps {
  employee: { id: string; nip: string; nama_lengkap: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeAccessSheet({ employee, open, onOpenChange }: EmployeeAccessSheetProps) {
  const queryClient = useQueryClient();

  const form = useForm<AccessFormValues>({
    resolver: zodResolver(accessSchema),
    defaultValues: { role: "user", access_modules: [], password: "" },
  });

  const accessModules = useWatch({ control: form.control, name: "access_modules", defaultValue: [] });

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
      form.reset({
        role: (currentAccess.role as "super_admin" | "admin" | "user") || "user",
        access_modules: currentAccess.access_modules || [],
        password: "",
      });
      lastSyncedId.current = employee.id;
    } else if (!isLoading) {
      // No access data (new account)
      form.reset({ role: "user", access_modules: [], password: "" });
      lastSyncedId.current = employee.id;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccess, open, isLoading, employee?.id]);

  const mutation = useMutation({
    mutationFn: async (values: AccessFormValues) => { const { data } = await api.put(`/kepegawaian/employees/${employee?.id}/access`, values); return data; },
    onSuccess: (data) => { toast.success(data.message || "Hak akses berhasil diperbarui"); queryClient.invalidateQueries({ queryKey: ["employees"] }); onOpenChange(false); },
    onError: (error: unknown) => { const err = error as { response?: { data?: { message?: string } } }; toast.error(err.response?.data?.message || "Gagal memperbarui hak akses"); },
  });

  function onSubmit(values: AccessFormValues) { mutation.mutate(values); }

  const isNewAccount = !currentAccess;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
              <Shield className="w-4 h-4" />
            </div>
            Manajemen Hak Akses
          </DialogTitle>
          <DialogDescription className="sr-only">Atur role dan modul akses pegawai</DialogDescription>
        </DialogHeader>

        {/* Employee Info Card */}
        {employee && (
          <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
              {employee.nama_lengkap.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-900 dark:text-zinc-100 leading-tight">{employee.nama_lengkap}</p>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">NIP: {employee.nip}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
            <p className="text-sm font-medium text-slate-500">Memuat data akses...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-red-500 bg-red-50 dark:bg-red-500/5 rounded-xl border border-red-100">
            <AlertCircle className="w-8 h-8 opacity-50" />
            <p className="text-sm font-semibold">Gagal memuat data akses</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Coba Lagi</Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Role Selection */}
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-bold">Peran Sistem (Role)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10 rounded-xl">
                          <SelectValue placeholder="Pilih Role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="user">User (Pegawai Biasa)</SelectItem>
                        <SelectItem value="admin">Admin (Pengelola Modul)</SelectItem>
                        <SelectItem value="super_admin">Super Admin (Akses Penuh)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              {/* Module Access */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold">Akses Modul</label>
                  <Badge variant="outline" className="text-[10px] font-bold">{accessModules.length} Terpilih</Badge>
                </div>
                <div className="grid gap-2">
                  {AVAILABLE_MODULES.map((module) => {
                    const isSelected = accessModules.includes(module.id);
                    return (
                      <div
                        key={module.id}
                        className={cn(
                          "flex flex-row items-center gap-3 rounded-xl border p-3 transition-all cursor-pointer select-none",
                          isSelected ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-100 hover:border-slate-200"
                        )}
                        onClick={() => {
                          const current = form.getValues("access_modules") || [];
                          const updated = isSelected
                            ? current.filter((v) => v !== module.id)
                            : [...current, module.id];
                          form.setValue("access_modules", updated, { shouldValidate: true });
                        }}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                          isSelected ? "bg-emerald-600 border-emerald-600" : "border-slate-300"
                        )}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className={cn("text-sm font-semibold", isSelected ? "text-emerald-700" : "text-slate-700")}>{module.label}</p>
                          <p className="text-[10px] text-slate-500">{module.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {form.formState.errors.access_modules && (
                  <p className="text-[11px] text-red-500">{form.formState.errors.access_modules.message}</p>
                )}
              </div>

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-bold flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-slate-400" />
                      {isNewAccount ? "Password Akun Baru" : "Reset Password (Opsional)"}
                    </FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" placeholder={isNewAccount ? "Masukkan password awal..." : "Kosongkan jika tidak ingin ganti..."} className="h-10 rounded-xl" {...field} />
                    </FormControl>
                    <div className="flex items-start gap-2 mt-1">
                      <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-slate-500 italic">
                        {isNewAccount ? "Akun login belum ada. Password ini akan digunakan pegawai untuk masuk pertama kali menggunakan NIP sebagai username." : "Hanya isi jika ingin mereset password pegawai secara paksa."}
                      </p>
                    </div>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button type="button" variant="outline" className="flex-1 h-10 rounded-xl" onClick={() => onOpenChange(false)}>Batal</Button>
                <Button type="submit" className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold" disabled={mutation.isPending}>
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
