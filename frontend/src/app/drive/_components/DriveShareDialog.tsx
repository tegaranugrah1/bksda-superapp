"use client";

import React, { useState, useEffect } from "react";
import {
  Share2,
  Globe,
  Users2,
  Lock,
  Copy,
  Check,
  Trash2,
  Loader2,
  Calendar,
  ShieldCheck,
  Link as LinkIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { DriveFileItem } from "./DriveFileList";

interface DriveShareDialogProps {
  file: DriveFileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShareItem {
  id: number;
  share_type: "internal" | "public";
  role: string;
  token?: string;
  public_url?: string;
  has_password: boolean;
  is_expired: boolean;
  expires_at?: string;
  user?: { id: number; name: string; email: string };
  unit?: { id: number; name: string };
}

export function DriveShareDialog({
  file,
  open,
  onOpenChange,
}: DriveShareDialogProps) {
  const [tab, setTab] = useState<"public" | "internal">("public");
  const [loading, setLoading] = useState(false);
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [copied, setCopied] = useState(false);

  // Form states for creating public share
  const [password, setPassword] = useState("");
  const [expiryDays, setExpiryDays] = useState<string>("7");
  const [submittingPublic, setSubmittingPublic] = useState(false);

  // Form states for creating internal share
  const [targetType, setTargetType] = useState<"user" | "unit">("user");
  const [targetId, setTargetId] = useState<string>("");
  const [internalRole, setInternalRole] = useState<"viewer" | "editor">("viewer");
  const [submittingInternal, setSubmittingInternal] = useState(false);

  const [availableUsers, setAvailableUsers] = useState<Array<{ id: number; name: string; email: string }>>([]);

  const loadShares = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await api.get(`/drive/files/${file.id}/shares`);
      setShares(res.data.shares || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal memuat data berbagi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && file) {
      loadShares();
      // Load user list for internal share
      api.get("/kepegawaian/employees?per_page=100")
        .then((res) => {
          const empList = res.data?.data || [];
          setAvailableUsers(empList.map((e: any) => ({
            id: e.user_id || e.id,
            name: e.name,
            email: e.email || `${e.nip}@bksda.local`,
          })));
        })
        .catch(() => {});
    }
  }, [open, file]);

  const publicShare = shares.find((s) => s.share_type === "public" && !s.is_expired);
  const internalShares = shares.filter((s) => s.share_type === "internal");

  const handleCreatePublicShare = async () => {
    if (!file) return;
    setSubmittingPublic(true);
    try {
      const res = await api.post(`/drive/files/${file.id}/shares`, {
        share_type: "public",
        password: password.trim() || undefined,
        expires_in_days: expiryDays === "0" ? undefined : parseInt(expiryDays, 10),
      });
      toast.success("Tautan publik berhasil dibuat!");
      setPassword("");
      loadShares();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal membuat tautan publik.");
    } finally {
      setSubmittingPublic(false);
    }
  };

  const handleRevokeShare = async (shareId: number) => {
    try {
      await api.delete(`/drive/shares/${shareId}`);
      toast.success("Akses berbagi berhasil dicabut.");
      loadShares();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal mencabut akses.");
    }
  };

  const handleCopyLink = () => {
    if (!publicShare?.public_url) return;
    navigator.clipboard.writeText(publicShare.public_url);
    setCopied(true);
    toast.success("Tautan berhasil disalin ke clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateInternalShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !targetId) return;

    setSubmittingInternal(true);
    try {
      await api.post(`/drive/files/${file.id}/shares`, {
        share_type: "internal",
        target_type: targetType,
        target_id: parseInt(targetId, 10),
        role: internalRole,
      });
      toast.success("Berkas berhasil dibagikan.");
      setTargetId("");
      loadShares();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal membagikan berkas.");
    } finally {
      setSubmittingInternal(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-emerald-600" />
            <span>Bagikan Berkas</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 truncate">
            {file?.name}
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 mt-2">
          <button
            type="button"
            onClick={() => setTab("public")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === "public"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Tautan Publik</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("internal")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === "internal"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Users2 className="w-3.5 h-3.5" />
            <span>Akses Pegawai</span>
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Memuat info berbagi...</p>
          </div>
        ) : tab === "public" ? (
          /* TAB 1: PUBLIC SHARE */
          <div className="space-y-4 pt-2">
            {publicShare ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Tautan Publik Aktif</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRevokeShare(publicShare.id)}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline"
                    >
                      Cabut Tautan
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={publicShare.public_url || ""}
                      className="text-xs h-9 font-mono bg-white dark:bg-slate-900"
                    />
                    <Button
                      size="sm"
                      onClick={handleCopyLink}
                      className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>

                  <div className="flex items-center gap-4 text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                    {publicShare.has_password && (
                      <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-500" /> Dilindungi Sandi
                      </span>
                    )}
                    {publicShare.expires_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Kedaluwarsa: {new Date(publicShare.expires_at).toLocaleDateString("id-ID")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pub-password" className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Kata Sandi (Opsional)</span>
                  </Label>
                  <Input
                    id="pub-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Biarkan kosong jika tanpa sandi"
                    className="text-xs rounded-xl h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pub-expiry" className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Masa Berlaku Tautan</span>
                  </Label>
                  <select
                    id="pub-expiry"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="1">1 Hari</option>
                    <option value="7">7 Hari (Direkomendasikan)</option>
                    <option value="30">30 Hari</option>
                    <option value="0">Selamanya (Tanpa Kedaluwarsa)</option>
                  </select>
                </div>

                <Button
                  type="button"
                  onClick={handleCreatePublicShare}
                  disabled={submittingPublic}
                  className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2"
                >
                  {submittingPublic ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4" />
                      <span>Buat Tautan Berbagi</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: INTERNAL SHARE */
          <div className="space-y-4 pt-2">
            <form onSubmit={handleCreateInternalShare} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pilih Pegawai
                </Label>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Pilih Pegawai --</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <Button
                type="submit"
                disabled={!targetId || submittingInternal}
                className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                {submittingInternal ? <Loader2 className="w-4 h-4 animate-spin" /> : "Tambahkan Pegawai"}
              </Button>
            </form>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Pegawai yang Memiliki Akses ({internalShares.length})
              </p>
              {internalShares.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">Belum ada pegawai lain yang dibagikan.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {internalShares.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {s.user?.name || "Pegawai"}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{s.user?.email}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRevokeShare(s.id)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
