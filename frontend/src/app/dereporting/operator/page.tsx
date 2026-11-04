"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    Users,
    UserPlus,
    Search,
    Shield,
    Trash2,
    ArrowRightLeft,
    Loader2,
    Building2,
    Mail,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useDebounce } from "@/hooks/use-debounce";

interface OperatorUser {
    id: number;
    name: string;
    username: string;
    email: string;
    dereporting_role: string;
    dereporting_bidang_id: string | null;
    dereporting_bidang?: {
        id: string;
        nama: string;
    } | null;
}

interface CandidateUser {
    id: number;
    name: string;
    username: string;
    email: string;
}

interface BidangItem {
    id: string;
    nama: string;
}

export default function DeReportingOperatorPage() {
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 400);

    // Dialog Tambah Operator
    const [addOpen, setAddOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<number | "">("");
    const [selectedBidangId, setSelectedBidangId] = useState("");
    const [candidateSearch, setCandidateSearch] = useState("");

    // Dialog Mutasi Operator
    const [mutateOpen, setMutateOpen] = useState(false);
    const [operatorToMutate, setOperatorToMutate] = useState<OperatorUser | null>(null);
    const [newBidangId, setNewBidangId] = useState("");

    // 1. Penarikan Daftar Operator Aktif
    const { data: operatorData, isLoading } = useQuery<{ data: OperatorUser[] }>({
        queryKey: ["dr-operators", debouncedSearch],
        queryFn: async () => {
            const res = await api.get("/dereporting/operators", {
                params: { search: debouncedSearch, paginate: "false" },
            });
            return res.data;
        },
    });

    // 2. Penarikan Daftar Master Bidang
    const { data: bidangList } = useQuery<BidangItem[]>({
        queryKey: ["dr-master-bidang"],
        queryFn: async () => {
            const res = await api.get("/dereporting/master/bidang", {
                params: { paginate: "false" },
            });
            return res.data.data;
        },
    });

    // 3. Penarikan Kandidat User (Belum Jadi Operator)
    const { data: candidateList } = useQuery<CandidateUser[]>({
        queryKey: ["dr-operator-candidates", candidateSearch],
        queryFn: async () => {
            const res = await api.get("/dereporting/operators/candidates", {
                params: { search: candidateSearch },
            });
            return res.data.data;
        },
        enabled: addOpen,
    });

    // Mutasi Angkat Operator Baru
    const addMutation = useMutation({
        mutationFn: async () => {
            await api.post("/dereporting/operators", {
                user_id: selectedUserId,
                bidang_id: selectedBidangId,
            });
        },
        onSuccess: () => {
            toast.success("Pegawai berhasil diangkat menjadi Operator DeReporting!");
            setAddOpen(false);
            setSelectedUserId("");
            setSelectedBidangId("");
            queryClient.invalidateQueries({ queryKey: ["dr-operators"] });
        },
        onError: (err: unknown) => {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || "Gagal mengangkat operator.");
        },
    });

    // Mutasi Pindah / Mutasi Bidang Tugas
    const mutateMutation = useMutation({
        mutationFn: async () => {
            if (!operatorToMutate) return;
            await api.put(`/dereporting/operators/${operatorToMutate.id}`, {
                bidang_id: newBidangId,
            });
        },
        onSuccess: () => {
            toast.success("Wilayah tugas operator berhasil dimutasi!");
            setMutateOpen(false);
            setOperatorToMutate(null);
            setNewBidangId("");
            queryClient.invalidateQueries({ queryKey: ["dr-operators"] });
        },
        onError: (err: unknown) => {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || "Gagal memutasi operator.");
        },
    });

    // Mutasi Cabut Jabatan Operator (Demote)
    const demoteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/dereporting/operators/${id}`);
        },
        onSuccess: () => {
            toast.success("Jabatan operator telah dicabut.");
            queryClient.invalidateQueries({ queryKey: ["dr-operators"] });
        },
        onError: () => {
            toast.error("Gagal mencabut jabatan operator.");
        },
    });

    const operators = operatorData?.data || [];
    const bidangs = bidangList || [];
    const candidates = candidateList || [];

    return (
        <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Users className="w-8 h-8 text-violet-500" /> Operator Laporan
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm">
                        Manajemen penugasan staf/pegawai sebagai Operator Pengelola Laporan per Seksi / Bidang Wilayah.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Pencarian */}
                    <div className="relative group flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 group-focus-within:text-violet-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Cari nama atau NIP..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all w-full placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                        />
                    </div>

                    <Button
                        type="button"
                        onClick={() => setAddOpen(true)}
                        className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-bold gap-2 shrink-0"
                    >
                        <UserPlus className="w-4 h-4" /> Angkat Operator
                    </Button>
                </div>
            </div>

            {/* Tabel Data Operator */}
            <div className="bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                        <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase font-bold text-[11px]">
                                <th className="p-4">Pegawai / Operator</th>
                                <th className="p-4">NIP / Akun</th>
                                <th className="p-4">Kontak Email</th>
                                <th className="p-4">Bidang Penugasan</th>
                                <th className="p-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-16 text-center text-violet-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                                        <span className="text-xs font-bold uppercase tracking-widest">
                                            Memuat Daftar Operator...
                                        </span>
                                    </td>
                                </tr>
                            ) : operators.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-16 text-center text-zinc-500">
                                        <Users className="w-8 h-8 mx-auto mb-3 text-zinc-300 dark:text-zinc-700" />
                                        Belum ada staf yang diangkat menjadi Operator Laporan.
                                    </td>
                                </tr>
                            ) : (
                                operators.map((op) => (
                                    <tr key={op.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold flex items-center justify-center shrink-0">
                                                    {op.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-zinc-900 dark:text-white text-sm">
                                                        {op.name}
                                                    </p>
                                                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                                                        <Shield className="w-3 h-3" /> Operator Aktif
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 font-mono text-zinc-600 dark:text-zinc-300">
                                            {op.username}
                                        </td>
                                        <td className="p-4 text-zinc-600 dark:text-zinc-300">
                                            <span className="flex items-center gap-1.5">
                                                <Mail className="w-3.5 h-3.5 text-zinc-400" />
                                                {op.email}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                                                <Building2 className="w-3.5 h-3.5" />
                                                {op.dereporting_bidang?.nama || "Semua Bidang"}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setOperatorToMutate(op);
                                                        setNewBidangId(op.dereporting_bidang_id || "");
                                                        setMutateOpen(true);
                                                    }}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors font-medium text-xs"
                                                    title="Mutasi Bidang Tugas"
                                                >
                                                    <ArrowRightLeft className="w-3.5 h-3.5" /> Mutasi
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (
                                                            confirm(
                                                                `Yakin ingin mencabut jabatan Operator untuk "${op.name}"? Pegawai akan dikembalikan menjadi user biasa.`
                                                            )
                                                        ) {
                                                            demoteMutation.mutate(op.id);
                                                        }
                                                    }}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors font-medium text-xs"
                                                    title="Cabut Jabatan Operator"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" /> Cabut
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Dialog Angkat Operator Baru */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-violet-600" />
                            Angkat Operator Laporan
                        </DialogTitle>
                        <DialogDescription className="text-xs text-zinc-500">
                            Pilih pegawai dan tentukan bidang/wilayah tugasnya untuk mengelola laporan DeReporting.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!selectedUserId || !selectedBidangId) return;
                            addMutation.mutate();
                        }}
                        className="space-y-4 py-2"
                    >
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Pilih Pegawai *</Label>
                            <Input
                                placeholder="Ketik nama atau NIP untuk menyaring..."
                                value={candidateSearch}
                                onChange={(e) => setCandidateSearch(e.target.value)}
                                className="text-xs rounded-xl mb-2"
                            />
                            <select
                                required
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(Number(e.target.value))}
                                className="w-full p-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500"
                            >
                                <option value="">-- Pilih Pegawai --</option>
                                {candidates.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} ({c.username})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Bidang / Wilayah Penugasan *</Label>
                            <select
                                required
                                value={selectedBidangId}
                                onChange={(e) => setSelectedBidangId(e.target.value)}
                                className="w-full p-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500"
                            >
                                <option value="">-- Pilih Bidang --</option>
                                {bidangs.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.nama}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setAddOpen(false)}
                                className="rounded-xl text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={addMutation.isPending || !selectedUserId || !selectedBidangId}
                                className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold"
                            >
                                {addMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                                        Memproses...
                                    </>
                                ) : (
                                    "Angkat Operator"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Dialog Mutasi Bidang Operator */}
            <Dialog open={mutateOpen} onOpenChange={setMutateOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2">
                            <ArrowRightLeft className="w-5 h-5 text-violet-600" />
                            Mutasi Wilayah Operator
                        </DialogTitle>
                        <DialogDescription className="text-xs text-zinc-500">
                            Pindahkan bidang tugas untuk operator <strong>{operatorToMutate?.name}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!newBidangId) return;
                            mutateMutation.mutate();
                        }}
                        className="space-y-4 py-2"
                    >
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Pilih Bidang Baru *</Label>
                            <select
                                required
                                value={newBidangId}
                                onChange={(e) => setNewBidangId(e.target.value)}
                                className="w-full p-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500"
                            >
                                <option value="">-- Pilih Bidang Baru --</option>
                                {bidangs.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.nama}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setMutateOpen(false)}
                                className="rounded-xl text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={mutateMutation.isPending || !newBidangId}
                                className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold"
                            >
                                {mutateMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    "Simpan Mutasi"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
