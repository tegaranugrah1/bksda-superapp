"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
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
import { getEcho, getRealtimeTokenId } from "@/lib/echo";
import { getAuthSnapshot, parseAuthSnapshot } from "@/lib/auth-store";

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

const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.035,
      delayChildren: 0.02,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.12 },
  },
};

const itemMotionVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 420,
      damping: 28,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};

const contentSliderVariants: Variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 20 : dir < 0 ? -20 : 0,
    opacity: 0,
    filter: "blur(2px)",
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.22,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -20 : dir < 0 ? 20 : 0,
    opacity: 0,
    filter: "blur(2px)",
    transition: {
      duration: 0.16,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

const tabOrder: Record<"all" | "unread" | "read", number> = {
  all: 0,
  unread: 1,
  read: 2,
};

export function NotificationBell({ onSelectTab }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<PortalNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // Popover filter state
  const [popoverFilter, setPopoverFilter] = useState<"all" | "unread">("all");
  const [popoverDirection, setPopoverDirection] = useState(0);

  // History Modal States
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"all" | "unread" | "read">("all");
  const [historyDirection, setHistoryDirection] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyItems, setHistoryItems] = useState<PortalNotificationItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Cache to prevent jumpy layout & reload flickering
  const historyCacheRef = useRef<Record<string, { items: PortalNotificationItem[]; total: number; totalPages: number }>>({});
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
    const cacheKey = `${filter}-p${page}`;
    const cached = historyCacheRef.current[cacheKey];
    if (cached) {
      setHistoryItems(cached.items);
      setHistoryTotal(cached.total);
      setHistoryTotalPages(cached.totalPages);
      setHistoryPage(page);
    } else {
      setHistoryLoading(true);
    }

    try {
      const resp = await api.get("/portal/notifications", {
        params: {
          page,
          per_page: 12,
          unread_only: filter === "unread" ? 1 : 0,
          read_only: filter === "read" ? 1 : 0,
        },
      });
      if (isMountedRef.current && resp.data) {
        const items = resp.data.data || [];
        const currentP = resp.data.meta?.current_page || 1;
        const totalP = resp.data.meta?.last_page || 1;
        const tot = resp.data.meta?.total || 0;

        historyCacheRef.current[cacheKey] = { items, total: tot, totalPages: totalP };

        setHistoryItems(items);
        setHistoryPage(currentP);
        setHistoryTotalPages(totalP);
        setHistoryTotal(tot);
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

  // Tab switch handler with direction tracking
  const handleSelectHistoryFilter = (newFilter: "all" | "unread" | "read") => {
    if (newFilter === historyFilter) return;
    const dir = tabOrder[newFilter] > tabOrder[historyFilter] ? 1 : -1;
    setHistoryDirection(dir);
    setHistoryFilter(newFilter);
  };

  const handleSelectPopoverFilter = (newFilter: "all" | "unread") => {
    if (newFilter === popoverFilter) return;
    setPopoverDirection(newFilter === "unread" ? 1 : -1);
    setPopoverFilter(newFilter);
  };

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

  // Real-time WebSocket subscription via Laravel Reverb
  useEffect(() => {
    const user = parseAuthSnapshot(getAuthSnapshot()).user;
    if (!user || !user.id) return;

    const tokenId = getRealtimeTokenId();
    if (!tokenId) return;
    const echo = getEcho();
    if (!echo) return;

    const channelName = `App.Models.User.${user.id}.${tokenId}`;
    const channel = echo.private(channelName);

    const handleCreated = (item: PortalNotificationItem) => {
      if (!isMountedRef.current) return;
      // Invalidate cache
      historyCacheRef.current = {};
      setUnreadCount((c) => c + 1);
      setNotifications((prev) => [item, ...prev.filter((n) => n.id !== item.id)].slice(0, 8));
      setHistoryItems((prev) => [item, ...prev.filter((n) => n.id !== item.id)]);

      // UI/UX Pro Max: interactive Sonner toast
      toast(item.title || "Notifikasi Baru", {
        description: item.message,
        action: item.action_tab
          ? {
              label: "Buka",
              onClick: () => onSelectTab?.(item.action_tab!, item.reference_id),
            }
          : undefined,
      });
    };

    channel.listen(".notification.created", handleCreated);

    return () => {
      try {
        echo.leave(channelName);
      } catch {
        // Safe fallback
      }
    };
  }, [onSelectTab]);

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
    historyCacheRef.current = {};
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
      historyCacheRef.current = {};
      setUnreadCount(0);
      toast.success("Semua notifikasi ditandai dibaca.");
    } catch {
      toast.error("Gagal menandai semua notifikasi.");
    } finally {
      setIsMarkingAll(false);
    }
  };

  const displayedNotifications =
    popoverFilter === "unread"
      ? notifications.filter((n) => !n.read_at)
      : notifications;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 450, damping: 22 }}
            className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-hidden cursor-pointer"
            title="Notifikasi"
            aria-label="Lihat Notifikasi"
          >
            <Bell className="w-5 h-5" />
            <AnimatePresence>
              {unreadCount > 0 && (
                <>
                  <motion.span
                    key="bell-unread-badge"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white shadow-xs pointer-events-none"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </motion.span>
                  <motion.span
                    key="bell-unread-ping"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-ping pointer-events-none"
                  />
                </>
              )}
            </AnimatePresence>
          </motion.button>
        </PopoverTrigger>

        {/* Popover Content with FIXED stable height: h-[480px] to prevent shifting */}
        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-85 sm:w-96 p-0 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl overflow-hidden flex flex-col h-[480px] max-h-[85vh]"
        >
          {/* Header (shrink-0) */}
          <div className="shrink-0 px-4 pt-3 pb-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-850/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Notifikasi
                </span>
                <AnimatePresence mode="wait">
                  {unreadCount > 0 && (
                    <motion.div
                      key={`popover-badge-${unreadCount}`}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 450, damping: 25 }}
                    >
                      <Badge
                        variant="secondary"
                        className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-none font-bold text-[10px] px-1.5 py-0"
                      >
                        {unreadCount} baru
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {unreadCount > 0 && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllRead}
                    disabled={isMarkingAll}
                    className="h-7 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 p-0 hover:bg-transparent cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5 mr-1" />
                    Tandai dibaca
                  </Button>
                </motion.div>
              )}
            </div>

            {/* Filter Tabs in Popover */}
            <div className="flex items-center p-0.5 bg-slate-200/70 dark:bg-slate-800 rounded-lg w-fit">
              <button
                type="button"
                onClick={() => handleSelectPopoverFilter("all")}
                className={cn(
                  "relative px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors z-10 cursor-pointer",
                  popoverFilter === "all"
                    ? "text-slate-900 dark:text-white font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                {popoverFilter === "all" && (
                  <motion.div
                    layoutId="popoverFilterIndicator"
                    className="absolute inset-0 bg-white dark:bg-slate-700 rounded-md shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  />
                )}
                <span className="relative z-20">Semua</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPopoverFilter("unread")}
                className={cn(
                  "relative px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors z-10 flex items-center gap-1.5 cursor-pointer",
                  popoverFilter === "unread"
                    ? "text-slate-900 dark:text-white font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                {popoverFilter === "unread" && (
                  <motion.div
                    layoutId="popoverFilterIndicator"
                    className="absolute inset-0 bg-white dark:bg-slate-700 rounded-md shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  />
                )}
                <span className="relative z-20 flex items-center gap-1">
                  Belum Dibaca
                  <AnimatePresence>
                    {unreadCount > 0 && (
                      <motion.span
                        key="popover-tab-unread-dot"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="px-1 rounded-full text-[9px] font-bold bg-emerald-500 text-white"
                      >
                        {unreadCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </button>
            </div>
          </div>

          {/* Body (flex-1 min-h-0 overflow-y-auto) */}
          <div className="flex-1 min-h-0 overflow-y-auto relative flex flex-col">
            <AnimatePresence mode="wait" custom={popoverDirection}>
              {loading ? (
                <motion.div
                  key="popover-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-full min-h-[260px] flex flex-col items-center justify-center text-slate-400 gap-2 my-auto"
                >
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                  <span className="text-xs">Memuat notifikasi...</span>
                </motion.div>
              ) : displayedNotifications.length === 0 ? (
                <motion.div
                  key={`popover-empty-${popoverFilter}`}
                  custom={popoverDirection}
                  variants={contentSliderVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="h-full min-h-[260px] flex flex-col items-center justify-center text-center px-4 my-auto"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2 shadow-xs">
                    <Bell className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {popoverFilter === "unread"
                      ? "Semua notifikasi sudah dibaca"
                      : "Belum ada notifikasi"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-[240px]">
                    {popoverFilter === "unread"
                      ? "Tidak ada notifikasi baru yang memerlukan perhatian."
                      : "Informasi penugasan, cuti, dan aset akan muncul di sini."}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key={`popover-list-${popoverFilter}`}
                  custom={popoverDirection}
                  variants={contentSliderVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="divide-y divide-slate-100 dark:divide-slate-800/60 flex-1"
                >
                  <motion.div variants={listContainerVariants} initial="hidden" animate="show">
                    {displayedNotifications.map((item) => (
                      <motion.div
                        key={item.id}
                        variants={itemMotionVariants}
                        layout
                        whileHover={{ backgroundColor: "rgba(241, 245, 249, 0.7)", x: 2 }}
                        whileTap={{ scale: 0.985 }}
                        onClick={() => handleItemClick(item)}
                        className={cn(
                          "flex items-start gap-3 p-3.5 cursor-pointer relative text-left transition-colors duration-300",
                          !item.read_at && "bg-emerald-50/40 dark:bg-emerald-950/20"
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
                                "text-xs leading-tight truncate transition-colors duration-200",
                                item.read_at
                                  ? "text-slate-700 dark:text-slate-300 font-medium"
                                  : "text-slate-900 dark:text-slate-100 font-bold"
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
                        <AnimatePresence>
                          {!item.read_at && (
                            <motion.span
                              key={`dot-popover-${item.id}`}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 25 }}
                              className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-2 shadow-xs"
                            />
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer (shrink-0 mt-auto) */}
          <div className="shrink-0 p-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-center">
            <motion.div className="w-full" whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  setHistoryOpen(true);
                }}
                className="w-full text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 h-8 rounded-xl cursor-pointer"
              >
                Lihat Semua Riwayat
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </motion.div>
          </div>
        </PopoverContent>
      </Popover>

      {/* History Dialog with FIXED LOCKED HEIGHT h-[580px] to NEVER shift position */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-xl sm:max-w-2xl p-0 overflow-hidden rounded-3xl border-slate-200 dark:border-slate-800 shadow-2xl h-[580px] max-h-[85vh] flex flex-col">
          {/* Header (shrink-0) */}
          <DialogHeader className="shrink-0 px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
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
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllRead}
                    disabled={isMarkingAll}
                    className="text-xs text-emerald-600 border-emerald-200 dark:border-emerald-800/60 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl h-8 cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5 mr-1" />
                    Tandai Semua Dibaca
                  </Button>
                </motion.div>
              )}
            </div>

            {/* Filter Tabs with animated sliding pill */}
            <div className="flex items-center p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl mt-3 w-fit">
              <button
                type="button"
                onClick={() => handleSelectHistoryFilter("all")}
                className={cn(
                  "relative px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors z-10 flex items-center gap-1.5 cursor-pointer",
                  historyFilter === "all"
                    ? "text-slate-900 dark:text-white font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                {historyFilter === "all" && (
                  <motion.div
                    layoutId="activeHistoryFilterTab"
                    className="absolute inset-0 bg-white dark:bg-slate-700 rounded-lg shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  />
                )}
                <span className="relative z-20">Semua</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectHistoryFilter("unread")}
                className={cn(
                  "relative px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors z-10 flex items-center gap-1.5 cursor-pointer",
                  historyFilter === "unread"
                    ? "text-slate-900 dark:text-white font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                {historyFilter === "unread" && (
                  <motion.div
                    layoutId="activeHistoryFilterTab"
                    className="absolute inset-0 bg-white dark:bg-slate-700 rounded-lg shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  />
                )}
                <span className="relative z-20 flex items-center gap-1.5">
                  Belum Dibaca
                  <AnimatePresence>
                    {unreadCount > 0 && (
                      <motion.span
                        key="history-tab-unread-count"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className={cn(
                          "px-1.5 py-0.2 rounded-full text-[10px] font-bold transition-colors",
                          historyFilter === "unread"
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                            : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        )}
                      >
                        {unreadCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectHistoryFilter("read")}
                className={cn(
                  "relative px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors z-10 flex items-center gap-1.5 cursor-pointer",
                  historyFilter === "read"
                    ? "text-slate-900 dark:text-white font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                {historyFilter === "read" && (
                  <motion.div
                    layoutId="activeHistoryFilterTab"
                    className="absolute inset-0 bg-white dark:bg-slate-700 rounded-lg shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  />
                )}
                <span className="relative z-20">Sudah Dibaca</span>
              </button>
            </div>
          </DialogHeader>

          {/* Body with locked flex-1 & directional slide transition */}
          <div className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-4 py-2 relative flex flex-col">
            {/* Subtle top loading indicator bar instead of full-page collapse */}
            {historyLoading && (
              <div className="absolute top-0 inset-x-0 h-0.5 bg-emerald-100 dark:bg-emerald-950 overflow-hidden z-20">
                <motion.div
                  className="h-full bg-emerald-500 w-1/3 rounded-full"
                  animate={{ x: ["-100%", "350%"] }}
                  transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
                />
              </div>
            )}

            <AnimatePresence mode="wait" custom={historyDirection}>
              {historyLoading && historyItems.length === 0 ? (
                <motion.div
                  key="history-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-full min-h-[340px] flex flex-col items-center justify-center text-slate-400 gap-2 my-auto"
                >
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  <span className="text-xs">Memuat daftar riwayat...</span>
                </motion.div>
              ) : historyItems.length === 0 ? (
                <motion.div
                  key={`history-empty-${historyFilter}`}
                  custom={historyDirection}
                  variants={contentSliderVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="h-full min-h-[340px] flex flex-col items-center justify-center text-center px-4 my-auto"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
                    <Bell className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {historyFilter === "unread"
                      ? "Tidak ada notifikasi yang belum dibaca"
                      : historyFilter === "read"
                      ? "Belum ada notifikasi yang sudah dibaca"
                      : "Belum ada riwayat notifikasi"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Semua aktivitas penugasan surat dinas, pengajuan cuti, dan peminjaman aset akan tercatat otomatis.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key={`history-list-${historyFilter}-page-${historyPage}`}
                  custom={historyDirection}
                  variants={contentSliderVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-1.5 flex-1"
                >
                  <motion.div variants={listContainerVariants} initial="hidden" animate="show">
                    {historyItems.map((item) => (
                      <motion.div
                        key={item.id}
                        variants={itemMotionVariants}
                        layout
                        whileHover={{ y: -2, transition: { duration: 0.15 } }}
                        whileTap={{ scale: 0.985 }}
                        onClick={() => handleItemClick(item)}
                        className={cn(
                          "flex items-start gap-3.5 p-3.5 rounded-2xl cursor-pointer transition-colors duration-300 relative text-left mb-1.5",
                          item.read_at
                            ? "hover:bg-slate-50 dark:hover:bg-slate-850/60 bg-transparent border border-transparent"
                            : "bg-emerald-50/50 dark:bg-emerald-950/25 border border-emerald-100/80 dark:border-emerald-900/40 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40"
                        )}
                      >
                        <div
                          className={cn(
                            "w-9 h-9 rounded-xl shrink-0 flex items-center justify-center shadow-xs mt-0.5 transition-transform duration-200",
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
                                  "text-xs leading-tight transition-colors duration-200",
                                  item.read_at
                                    ? "text-slate-700 dark:text-slate-300 font-medium"
                                    : "text-slate-900 dark:text-slate-100 font-bold"
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
                        <div className="shrink-0 flex items-center gap-2 self-center pl-2">
                          <AnimatePresence>
                            {!item.read_at && (
                              <motion.span
                                key={`dot-history-${item.id}`}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs"
                                title="Belum dibaca"
                              />
                            )}
                          </AnimatePresence>
                          <div className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Stable Fixed Footer (shrink-0 mt-auto) - ALWAYS rendered to lock bottom edge */}
          <div className="shrink-0 h-12 flex items-center justify-between px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
            <span className="text-xs text-slate-500">
              {historyTotal > 0
                ? `Halaman ${historyPage} dari ${historyTotalPages} (${historyTotal} item)`
                : `0 item`}
            </span>
            <div className="flex items-center gap-1.5">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchHistory(historyPage - 1)}
                  disabled={historyPage <= 1 || historyLoading}
                  className="h-7 w-7 p-0 rounded-lg cursor-pointer"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchHistory(historyPage + 1)}
                  disabled={historyPage >= historyTotalPages || historyLoading}
                  className="h-7 w-7 p-0 rounded-lg cursor-pointer"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </motion.div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
