"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield, KeyRound, Loader2, AlertCircle, Info } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// 1. Validation Schema (Rule 2.4 - Min 1 module)
const accessSchema = z.object({
  role: z.enum(["super_admin", "admin", "user"]),
  access_modules: z.array(z.string()).min(1, "Wajib memilih minimal 1 modul"),
  password: z.string().min(8, "Password minimal 8 karakter").optional().or(z.literal("")),
});

type AccessFormValues = z.infer<typeof accessSchema>;

// Module definitions consistent with ModuleSwitcher
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

  // 2. Form Setup
  const form = useForm<AccessFormValues>({
    resolver: zodResolver(accessSchema),
    defaultValues: {
      role: "user",
      access_modules: ["kepegawaian"], // Default minimal access
      password: "",
    },
  });

  const accessModules = useWatch({
    control: form.control,
    name: "access_modules",
    defaultValue: [],
  });

  // 3. Fetch Current Access State
  const { data: currentAccess, isLoading, isError, refetch } = useQuery({
    queryKey: ["employee-access", employee?.id],
    queryFn: async () => {
      const { data } = await api.get(`/kepegawaian/employees/${employee?.id}/access`);
      return data.data;
    },
    enabled: !!employee && open,
    staleTime: 0, // Always get fresh data when opening
  });

  // 4. Sync form with fetched data
  useEffect(() => {
    if (open && currentAccess) {
      form.reset({
        role: (currentAccess.role as "super_admin" | "admin" | "user") || "user",
        access_modules: currentAccess.access_modules || [],
        password: "",
      });
    } else if (open && !isLoading && !currentAccess) {
       // New account scenario
       form.reset({
         role: "user",
         access_modules: ["kepegawaian"],
         password: "",
       });
    }
  }, [currentAccess, open, isLoading, form]);

  // 5. Update Mutation
  const mutation = useMutation({
    mutationFn: async (values: AccessFormValues) => {
      const { data } = await api.put(`/kepegawaian/employees/${employee?.id}/access`, values);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Hak akses berhasil diperbarui");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || "Gagal memperbarui hak akses";
      toast.error(message);
    },
  });

  function onSubmit(values: AccessFormValues) {
    mutation.mutate(values);
  }

  const isNewAccount = !currentAccess;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-white dark:bg-zinc-950 border-l dark:border-zinc-800">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-white">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
              <Shield className="w-5 h-5" />
            </div>
            Manajemen Hak Akses
          </SheetTitle>
          <SheetDescription className="text-zinc-500 dark:text-zinc-400">
            {employee ? (
              <div className="mt-2 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
                  {employee.nama_lengkap.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{employee.nama_lengkap}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 font-mono">NIP: {employee.nip}</p>
                </div>
              </div>
            ) : (
              "Pilih pegawai untuk mengatur hak akses."
            )}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-sm font-medium text-zinc-500 animate-pulse">Memuat data akses...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-500 bg-red-50 dark:bg-red-500/5 rounded-2xl border border-red-100 dark:border-red-500/10">
            <AlertCircle className="w-10 h-10 opacity-50" />
            <p className="text-sm font-semibold">Gagal memuat data akses</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">Coba Lagi</Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Role Selection */}
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Peran Sistem (Role)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                          <SelectValue placeholder="Pilih Role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl border-zinc-200 dark:border-zinc-800 shadow-xl">
                        <SelectItem value="user">User (Pegawai Biasa)</SelectItem>
                        <SelectItem value="admin">Admin (Pengelola Modul)</SelectItem>
                        <SelectItem value="super_admin">Super Admin (Akses Penuh)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              {/* Module Access List */}
              <FormField
                control={form.control}
                name="access_modules"
                render={() => (
                  <FormItem className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Akses Modul</FormLabel>
                      <Badge variant="outline" className="text-[10px] font-bold border-zinc-200 dark:border-zinc-800">
                        {accessModules.length} Terpilih
                      </Badge>
                    </div>
                    <div className="grid gap-2.5">
                      {AVAILABLE_MODULES.map((module) => (
                        <FormField
                          key={module.id}
                          control={form.control}
                          name="access_modules"
                          render={({ field }) => {
                            const isSelected = field.value?.includes(module.id);
                            return (
                              <FormItem
                                key={module.id}
                                className={cn(
                                  "flex flex-row items-center space-x-3 space-y-0 rounded-xl border p-3.5 transition-all cursor-pointer group",
                                  isSelected 
                                    ? "bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20" 
                                    : "bg-white dark:bg-zinc-900/40 border-zinc-100 dark:border-zinc-800/50 hover:border-zinc-200 dark:hover:border-zinc-700"
                                )}
                                onClick={() => {
                                  const checked = !isSelected;
                                  field.onChange(
                                    checked
                                      ? [...field.value, module.id]
                                      : field.value?.filter((v) => v !== module.id)
                                  );
                                }}
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={isSelected}
                                    className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                    onCheckedChange={() => {}} // Handled by container onClick
                                  />
                                </FormControl>
                                <div className="flex-1 space-y-0.5">
                                  <p className={cn(
                                    "text-sm font-bold transition-colors",
                                    isSelected ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-700 dark:text-zinc-300"
                                  )}>
                                    {module.label}
                                  </p>
                                  <p className="text-[10px] text-zinc-500 dark:text-zinc-500 leading-tight">
                                    {module.description}
                                  </p>
                                </div>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              {/* Password Management */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-zinc-400" />
                      {isNewAccount ? "Password Akun Baru" : "Reset Password (Opsional)"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        placeholder={isNewAccount ? "Masukkan password awal..." : "Kosongkan jika tidak ingin ganti..."}
                        className="h-11 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:ring-emerald-500/20 focus:border-emerald-500"
                        {...field}
                      />
                    </FormControl>
                    <div className="flex items-start gap-2 mt-1">
                      <Info className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-500 italic">
                        {isNewAccount 
                          ? "Akun login belum ada. Password ini akan digunakan pegawai untuk masuk pertama kali menggunakan NIP sebagai username."
                          : "Hanya isi field ini jika Anda ingin mereset password pegawai tersebut secara paksa."}
                      </p>
                    </div>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              <div className="pt-6 border-t dark:border-zinc-800 flex flex-col gap-3 sticky bottom-0 bg-white dark:bg-zinc-950 pb-2">
                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-12 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-500/40 active:scale-95"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      {isNewAccount ? "Terbitkan Akses Akun" : "Simpan Perubahan Akses"}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-11 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  onClick={() => onOpenChange(false)}
                >
                  Batal
                </Button>
              </div>
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  );
}
