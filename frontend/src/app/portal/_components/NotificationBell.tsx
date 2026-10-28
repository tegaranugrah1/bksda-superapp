"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Bell,
  CheckCheck,
  FileText,
  Calendar,
  Package,
  Info,
  Clock,
  ExternalLink,
  Loader2,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface PortalNotificationItem {
  id: number;
  user_id: number;
  employee_id: number | null;
  title: string;
  message: string;
  type: "surat_tugas" | "cuti" | "bmn" | "system" | string;
  action_tab: string | null;
  reference_id: string | null;
  data?: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

interface NotificationBellProps {
  onSelectTab?: (tabKey: string, referenceId?: string | null) => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Baru saja";
    if (minutes < 60) return `${minutes}m lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}j lalu`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}h lalu`;
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateString;
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case "surat_tugas":
      return <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    case "cuti":
      return <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    case "bmn":
      return <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    default:
      return <Info className="w-4 h-4 text-slate-500 dark:text-slate-400" />;
  }
}

export function NotificationBell({ onSelectTab }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<PortalNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // History Modal States
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"all" | "unread">("all");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyItems, setHistoryItems] = useState<PortalNotificationItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const isMountedRef = useRef(true);

  // Fetch quick latest notifications for the popover
  const fetchLatest = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const resp = await api.get("/portal/notifications", {
        params: { per_page: 8 },
      });
      if (isMountedRef.current && resp.data) {
        setNotifications(resp.data.data || []);
        if (resp.data.meta?.unread_count !== undefined) {
          setUnreadCount(resp.data.meta.unread_count);
        }
      }
    } catch {
      // Background poll failure is silent
    } finally {
      if (isMountedRef.current && !isBackground) setLoading(false);
    }
  }, []);

  // Fetch full history for the modal
  const fetchHistory = useCallback(async (page = 1, filter = historyFilter) => {
    setHistoryLoading(true);
    try {
      const resp = await api.get("/portal/notifications", {
        params: {
          page,
          per_page: 12,
          unread_only: filter === "unread" ? 1 : 0,
        },
      });
      if (isMountedRef.current && resp.data) {
        setHistoryItems(resp.data.data || []);
        setHistoryPage(resp.data.meta?.current_page || 1);
        setHistoryTotalPages(resp.data.meta?.last_page || 1);
        setHistoryTotal(resp.data.meta?.total || 0);
        if (resp.data.meta?.unread_count !== undefined) {
          setUnreadCount(resp.data.meta.unread_count);
        }
      }
    } catch {
      toast.error("Gagal memuat riwayat notifikasi.");
    } finally {
      if (isMountedRef.current) setHistoryLoading(false);
    }
  }, [historyFilter]);

  // Polling setup: 35 seconds + on window focus
  useEffect(() => {
    isMountedRef.current = true;
    fetchLatest(false);

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchLatest(true);
      }
    }, 35000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchLatest(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchLatest]);

  // Handle open history modal
  useEffect(() => {
    if (historyOpen) {
      fetchHistory(1, historyFilter);
    }
  }, [historyOpen, historyFilter, fetchHistory]);

  const handleMarkAsRead = async (item: PortalNotificationItem) => {
    if (item.read_at) return;

    // Optimistic update
    const nowIso = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read_at: nowIso } : n))
    );
    setHistoryItems((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read_at: nowIso } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await api.post(`/portal/notifications/${item.id}/read`);
    } catch {
      // Revert if error
      fetchLatest(true);
    }
  };

  const handleItemClick = async (item: PortalNotificationItem) => {
    await handleMarkAsRead(item);
    setOpen(false);
    setHistoryOpen(false);

    if (item.action_tab && onSelectTab) {
      onSelectTab(item.action_tab, item.reference_id);
    }
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await api.post("/portal/notifications/mark-all-read");
      const nowIso = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: nowIso })));
      setHistoryItems((prev) => prev.map((n) => ({ ...n, read_at: nowIso })));
      setUnreadCount(0);
      toast.success("Semua notifikasi ditandai dibaca.");
    } catch {
      toast.error("Gagal menandai semua notifikasi.");
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-hidden"
            title="Notifikasi"
            aria-label="Lihat Notifikasi"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <>
                <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white shadow-xs">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-ping pointer-events-none" />
              </>
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-85 sm:w-96 p-0 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-850/50">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Notifikasi
              </span>
              {unreadCount > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-none font-bold text-[10px] px-1.5 py-0"
                >
                  {unreadCount} baru
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={isMarkingAll}
                className="h-7 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 p-0 hover:bg-transparent"
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                Tandai dibaca
              </Button>
            )}
          </div>

          {/* List items */}
          <div className="max-h-85 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading ? (
              <div className="py-10 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                <span className="text-xs">Memuat notifikasi...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Belum ada notifikasi
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Informasi penugasan, cuti, dan aset akan muncul di sini.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "flex items-start gap-3 p-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors relative text-left",
                    !item.read_at && "bg-emerald-50/30 dark:bg-emerald-950/15"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-xl shrink-0 flex items-center justify-center shadow-xs mt-0.5",
                      item.type === "surat_tugas" &&
                        "bg-emerald-100/70 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300",
                      item.type === "cuti" &&
                        "bg-amber-100/70 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300",
                      item.type === "bmn" &&
                        "bg-blue-100/70 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300",
                      item.type === "system" &&
                        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    )}
                  >
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={cn(
                          "text-xs font-bold leading-tight truncate",
                          item.read_at
                            ? "text-slate-700 dark:text-slate-300"
                            : "text-slate-900 dark:text-slate-100"
                        )}
                      >
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                      {item.message}
                    </p>
                  </div>
                  {!item.read_at && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                setHistoryOpen(true);
              }}
              className="w-full text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 h-8 rounded-xl"
            >
              Lihat Semua Riwayat
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-xl sm:max-w-2xl p-0 overflow-hidden rounded-3xl border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Riwayat Notifikasi
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Daftar seluruh riwayat penugasan, cuti, dan aktivitas aset Anda.
                </DialogDescription>
              </div>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllRead}
                  disabled={isMarkingAll}
                  className="text-xs text-emerald-600 border-emerald-200 dark:border-emerald-800/60 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl h-8"
                >
                  <CheckCheck className="w-3.5 h-3.5 mr-1" />
                  Tandai Semua Dibaca
                </Button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 mt-3 pt-2">
              <button
                type="button"
                onClick={() => setHistoryFilter("all")}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-semibold transition-colors",
                  historyFilter === "all"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter("unread")}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5",
                  historyFilter === "unread"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                Belum Dibaca
                {unreadCount > 0 && (
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                      historyFilter === "unread"
                        ? "bg-emerald-800 text-emerald-100"
                        : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                    )}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="max-h-110 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 px-2 sm:px-4 py-2">
            {historyLoading ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                <span className="text-xs">Memuat daftar riwayat...</span>
              </div>
            ) : historyItems.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {historyFilter === "unread"
                    ? "Tidak ada notifikasi yang belum dibaca"
                    : "Belum ada riwayat notifikasi"}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Semua aktivitas penugasan surat dinas, pengajuan cuti, dan peminjaman aset akan tercatat otomatis.
                </p>
              </div>
            ) : (
              historyItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "flex items-start gap-3.5 p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-850/60 cursor-pointer transition-all relative text-left my-1",
                    !item.read_at &&
                      "bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30"
                  )}
                >
                  <div
                    className={cn(
                      "w-9 h-9 rounded-xl shrink-0 flex items-center justify-center shadow-xs mt-0.5",
                      item.type === "surat_tugas" &&
                        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
                      item.type === "cuti" &&
                        "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                      item.type === "bmn" &&
                        "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                      item.type === "system" &&
                        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    )}
                  >
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-xs font-bold leading-tight",
                            item.read_at
                              ? "text-slate-700 dark:text-slate-300"
                              : "text-slate-900 dark:text-slate-100"
                          )}
                        >
                          {item.title}
                        </span>
                        {item.action_tab && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] uppercase tracking-wider py-0 px-1 bg-slate-100 dark:bg-slate-800 text-slate-500 border-none"
                          >
                            {item.action_tab}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center self-center text-slate-400 pl-2">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Footer */}
          {historyTotalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <span className="text-xs text-slate-500">
                Halaman {historyPage} dari {historyTotalPages} ({historyTotal} item)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchHistory(historyPage - 1)}
                  disabled={historyPage <= 1 || historyLoading}
                  className="h-8 w-8 p-0 rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchHistory(historyPage + 1)}
                  disabled={historyPage >= historyTotalPages || historyLoading}
                  className="h-8 w-8 p-0 rounded-lg"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
