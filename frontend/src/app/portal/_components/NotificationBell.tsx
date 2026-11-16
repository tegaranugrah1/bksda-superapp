"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Bell,
  CheckCheck,
  FileText,
  Calendar,
  Package,
  Info,
  Clock,
  Loader2,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
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
import { api, clearGetCache } from "@/lib/api";
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
  onNotification?: (item: PortalNotificationItem) => void;
  onRefresh?: () => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const m = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
    if (m < 1) return "Baru saja";
    if (m < 60) return `${m}m lalu`;
    if (m < 1440) return `${Math.floor(m / 60)}j lalu`;
    if (m < 10080) return `${Math.floor(m / 1440)}h lalu`;
    return new Date(dateString).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  } catch {
    return dateString;
  }
}

function resolveSafeInternalLink(data?: Record<string, unknown> | null): string | null {
  const link = data?.link;
  if (typeof link !== "string") return null;
  const trimmed = link.trim();
  return trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("\\")
    ? trimmed
    : null;
}

const TYPE_STYLES: Record<string, string> = {
  surat_tugas: "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)]",
  cuti: "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border border-[var(--ds-status-warning-border)]",
  bmn: "bg-[var(--ds-status-info-bg)] text-[var(--ds-status-info-fg)] border border-[var(--ds-status-info-border)]",
  dereporting: "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
  system: "bg-[var(--ds-status-neutral-bg)] text-[var(--ds-status-neutral-fg)] border border-[var(--ds-status-neutral-border)]",
};

function NotificationRowItem({
  item,
  variant,
  onSelect,
}: {
  item: PortalNotificationItem;
  variant: "popover" | "history";
  onSelect: (item: PortalNotificationItem) => void;
}) {
  const isHistory = variant === "history";
  return (
    <motion.div
      variants={itemMotionVariants}
      onClick={() => onSelect(item)}
      className={cn(
        "flex items-start gap-3 p-4 cursor-pointer transition-colors duration-150 relative text-left",
        isHistory
          ? cn(
              "rounded-lg mb-2 active:scale-[0.99]",
              item.read_at
                ? "hover:bg-[var(--ds-surface-muted)] bg-transparent border border-transparent"
                : "bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)]"
            )
          : cn("hover:bg-[var(--ds-surface-muted)]", !item.read_at && "bg-[var(--ds-accent-soft)]")
      )}
    >
      <div
        className={cn(
          isHistory ? "w-9 h-9 transition-transform duration-200" : "w-8 h-8",
          "rounded-lg shrink-0 flex items-center justify-center shadow-xs mt-1",
          TYPE_STYLES[item.type] || TYPE_STYLES.system
        )}
      >
        {getTypeIcon(item.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn(
                "text-xs leading-tight truncate transition-colors duration-200",
                item.read_at ? "text-[var(--ds-fg-secondary)] font-medium" : "text-[var(--ds-fg)] font-bold"
              )}
            >
              {item.title}
            </span>
            {isHistory && item.action_tab && (
              <Badge
                variant="secondary"
                className="text-xs uppercase tracking-wider py-0 px-2 bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] border border-slate-200/80 dark:border-zinc-800"
              >
                {item.action_tab}
              </Badge>
            )}
          </div>
          <span className="text-xs text-[var(--ds-fg-muted)] shrink-0 flex items-center gap-1 tabular-nums">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(item.created_at)}
          </span>
        </div>
        <p className={cn("text-xs text-[var(--ds-fg-muted)] mt-1 break-words", isHistory ? "leading-relaxed" : "line-clamp-2 leading-snug")}>
          {item.message}
        </p>
      </div>
      {isHistory ? (
        <div className="shrink-0 flex items-center gap-2 self-center pl-2">
          <AnimatePresence>
            {!item.read_at && (
              <motion.span
                key={`dot-history-${item.id}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className="w-2 h-2 rounded-full bg-[var(--ds-accent-solid)] shadow-xs"
                title="Belum dibaca"
              />
            )}
          </AnimatePresence>
          <div className="text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] transition-colors">
            <ExternalLink className="w-4 h-4" />
          </div>
        </div>
      ) : (
        <AnimatePresence>
          {!item.read_at && (
            <motion.span
              key={`dot-popover-${item.id}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="w-2 h-2 rounded-full bg-[var(--ds-accent-solid)] shrink-0 mt-2 shadow-xs"
            />
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}

function getTypeIcon(type: string) {
  switch (type) {
    case "surat_tugas":
      return <FileText className="w-4 h-4 text-[var(--ds-accent-fg)]" />;
    case "cuti":
      return <Calendar className="w-4 h-4 text-[var(--ds-status-warning-fg)]" />;
    case "bmn":
      return <Package className="w-4 h-4 text-[var(--ds-status-info-fg)]" />;
    case "dereporting":
      return <FileText className="w-4 h-4 text-sky-700 dark:text-sky-300" />;
    default:
      return <Info className="w-4 h-4 text-[var(--ds-status-neutral-fg)]" />;
  }
}

const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.1 },
  },
};

const itemMotionVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.15,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.1 },
  },
};

const contentSliderVariants: Variants = {
  enter: {
    opacity: 0,
    y: 5,
  },
  center: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.15,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.1,
      ease: "easeIn",
    },
  },
};

const tabOrder: Record<"all" | "unread" | "read", number> = {
  all: 0,
  unread: 1,
  read: 2,
};

export function NotificationBell({ onSelectTab, onNotification, onRefresh }: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<PortalNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // Popover filter state
  const [popoverFilter, setPopoverFilter] = useState<"all" | "unread">("all");
  const popoverFilterRef = useRef<"all" | "unread">("all");
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
  const latestRequestRef = useRef(0);
  const historyRequestRef = useRef(0);
  const seenIdsRef = useRef(new Set<number>());
  const initializedRef = useRef(false);
  const notificationHandlerRef = useRef(onNotification);
  const refreshHandlerRef = useRef(onRefresh);
  const historyStateRef = useRef({ open: false, page: 1, filter: "all" as "all" | "unread" | "read" });
  const itemClickHandlerRef = useRef<(item: PortalNotificationItem) => Promise<void>>(async () => {});

  useEffect(() => { notificationHandlerRef.current = onNotification; }, [onNotification]);
  useEffect(() => { refreshHandlerRef.current = onRefresh; }, [onRefresh]);
  useEffect(() => { popoverFilterRef.current = popoverFilter; }, [popoverFilter]);
  useEffect(() => {
    historyStateRef.current = { open: historyOpen, page: historyPage, filter: historyFilter };
  }, [historyOpen, historyPage, historyFilter]);

  // Fetch quick latest notifications for the popover
  const fetchLatest = useCallback(async (isBackground = false, filterOverride?: "all" | "unread") => {
    const request = ++latestRequestRef.current;
    const activeFilter = filterOverride ?? popoverFilterRef.current;
    if (!isBackground) setLoading(true);
    try {
      const resp = await api.get("/portal/notifications", {
        params: { per_page: 8, ...(activeFilter === "unread" ? { unread_only: 1 } : {}) },
      });
      if (isMountedRef.current && request === latestRequestRef.current && resp.data) {
        const items: PortalNotificationItem[] = resp.data.data || [];
        for (const item of items) {
          if (initializedRef.current && !filterOverride && activeFilter === "all" && !seenIdsRef.current.has(item.id)) {
            historyCacheRef.current = {};
            notificationHandlerRef.current?.(item);
          }
          seenIdsRef.current.add(item.id);
        }
        initializedRef.current = true;
        setNotifications(items);
        if (resp.data.meta?.unread_count !== undefined) setUnreadCount(resp.data.meta.unread_count);
        refreshHandlerRef.current?.();
      }
    } catch {
      // Background poll failure is silent
    } finally {
      if (isMountedRef.current && request === latestRequestRef.current) setLoading(false);
    }
  }, []);

  // Fetch full history for the modal
  const fetchHistory = useCallback(async (page = 1, filter = historyStateRef.current.filter) => {
    const request = ++historyRequestRef.current;
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
      if (isMountedRef.current && request === historyRequestRef.current && resp.data) {
        const items = resp.data.data || [];
        const currentP = resp.data.meta?.current_page || 1;
        const totalP = resp.data.meta?.last_page || 1;
        const tot = resp.data.meta?.total || 0;

        historyCacheRef.current[cacheKey] = { items, total: tot, totalPages: totalP };

        setHistoryItems(items);
        setHistoryPage(currentP);
        setHistoryTotalPages(totalP);
        setHistoryTotal(tot);
      }
    } catch {
      if (isMountedRef.current && request === historyRequestRef.current) toast.error("Gagal memuat riwayat notifikasi.");
    } finally {
      if (isMountedRef.current && request === historyRequestRef.current) setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    const history = historyStateRef.current;
    if (history.open) void fetchHistory(history.page, history.filter);
  }, [notifications, fetchHistory]);

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
    void fetchLatest(false, newFilter);
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
      latestRequestRef.current++;
      historyRequestRef.current++;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchLatest]);

  // Track auth/session swaps so Echo tears down the previous user's private channel cleanly.
  const [authEpoch, setAuthEpoch] = useState(0);
  useEffect(() => {
    const bump = () => setAuthEpoch((v) => v + 1);
    window.addEventListener("auth-change", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("auth-change", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

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
      if (!isMountedRef.current || seenIdsRef.current.has(item.id)) return;
      seenIdsRef.current.add(item.id);
      clearGetCache();
      historyCacheRef.current = {};
      void fetchLatest(true);
      const history = historyStateRef.current;
      if (history.open) void fetchHistory(history.page, history.filter);
      notificationHandlerRef.current?.(item);

      // UI/UX Pro Max: interactive Sonner toast
      const hasAction = Boolean(item.action_tab || resolveSafeInternalLink(item.data));
      toast(item.title || "Notifikasi Baru", {
        description: item.message,
        action: hasAction
          ? {
              label: "Buka",
              onClick: () => void itemClickHandlerRef.current(item),
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
  }, [authEpoch, onSelectTab, fetchLatest, fetchHistory]);

  // Handle open history modal
  useEffect(() => {
    if (historyOpen) {
      fetchHistory(1, historyFilter);
    }
  }, [historyOpen, historyFilter, fetchHistory]);

  const handleMarkAsRead = useCallback(async (item: PortalNotificationItem) => {
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
      const response = await api.post(`/portal/notifications/${item.id}/read`);
      latestRequestRef.current++;
      historyRequestRef.current++;
      if (response.data?.unread_count !== undefined) setUnreadCount(response.data.unread_count);
      void fetchLatest(true);
    } catch {
      // Revert if error
      fetchLatest(true);
    }
  }, [fetchLatest]);

  const handleItemClick = useCallback(async (item: PortalNotificationItem) => {
    await handleMarkAsRead(item);
    setOpen(false);
    setHistoryOpen(false);

    const safeLink = resolveSafeInternalLink(item.data);
    if (safeLink) {
      router.push(safeLink);
      return;
    }

    const availability = typeof item.data?.availability === "string" ? item.data.availability : null;
    const status = typeof item.data?.status === "string" ? item.data.status : null;
    const blockedRef = availability === "unavailable" || availability === "trashed" || status === "removed";
    if (item.action_tab && onSelectTab) {
      onSelectTab(item.action_tab, blockedRef ? null : item.reference_id);
    }
  }, [handleMarkAsRead, onSelectTab, router]);

  useEffect(() => {
    itemClickHandlerRef.current = handleItemClick;
  }, [handleItemClick]);

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await api.post("/portal/notifications/mark-all-read");
      latestRequestRef.current++;
      historyRequestRef.current++;
      const nowIso = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: nowIso })));
      setHistoryItems((prev) => prev.map((n) => ({ ...n, read_at: nowIso })));
      historyCacheRef.current = {};
      setUnreadCount(0);
      void fetchLatest(true);
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
            className="relative p-2 rounded-lg text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--ds-accent-fg)] cursor-pointer"
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
                    className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[var(--ds-accent-solid)] text-xs font-bold text-[var(--ds-accent-on-solid)] shadow-xs pointer-events-none tabular-nums"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </motion.span>
                  <motion.span
                    key="bell-unread-ping"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute top-1 right-1 w-2 h-2 bg-[var(--ds-accent-solid)] rounded-full animate-ping pointer-events-none"
                  />
                </>
              )}
            </AnimatePresence>
          </motion.button>
        </PopoverTrigger>

        {/* Popover Content with FIXED stable height: h-[480px] to prevent shifting */}
        <PopoverContent
          data-module="portal"
          align="end"
          sideOffset={8}
          className="w-[340px] sm:w-96 max-w-[calc(100vw-2rem)] p-0 rounded-3xl shadow-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] overflow-hidden flex flex-col h-[480px] max-h-[85vh]"
        >
          {/* Header (shrink-0) */}
          <div className="shrink-0 px-4 py-3 border-b border-slate-200/70 dark:border-zinc-800 bg-[var(--ds-surface-muted)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[var(--ds-fg)]">
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
                        className="bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] font-bold text-xs px-2 py-0 tabular-nums"
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
                    className="h-8 text-xs text-[var(--ds-accent-fg)] hover:bg-transparent p-0 cursor-pointer"
                  >
                    <CheckCheck className="w-4 h-4 mr-1" />
                    Tandai dibaca
                  </Button>
                </motion.div>
              )}
            </div>

            {/* Filter Tabs in Popover */}
            <div className="flex items-center p-1 bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-lg w-fit">
              <button
                type="button"
                onClick={() => handleSelectPopoverFilter("all")}
                className={cn(
                  "relative px-3 py-1 rounded-lg text-xs font-medium transition-colors z-10 cursor-pointer",
                  popoverFilter === "all"
                    ? "text-[var(--ds-fg)] font-semibold"
                    : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
                )}
              >
                {popoverFilter === "all" && (
                  <motion.div
                    layoutId="popoverFilterIndicator"
                    className="absolute inset-0 bg-[var(--ds-accent-soft)] rounded-lg shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  />
                )}
                <span className="relative z-20">Semua</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPopoverFilter("unread")}
                className={cn(
                  "relative px-3 py-1 rounded-lg text-xs font-medium transition-colors z-10 flex items-center gap-2 cursor-pointer",
                  popoverFilter === "unread"
                    ? "text-[var(--ds-fg)] font-semibold"
                    : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
                )}
              >
                {popoverFilter === "unread" && (
                  <motion.div
                    layoutId="popoverFilterIndicator"
                    className="absolute inset-0 bg-[var(--ds-accent-soft)] rounded-lg shadow-xs"
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
                        className="px-2 rounded-full text-xs font-bold bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] tabular-nums"
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
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative flex flex-col">
            <AnimatePresence mode="wait" custom={popoverDirection}>
              {loading ? (
                <motion.div
                  key="popover-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-full min-h-[260px] flex flex-col items-center justify-center text-[var(--ds-fg-muted)] gap-2 my-auto"
                >
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--ds-accent-fg)]" />
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
                  <div className="w-10 h-10 rounded-full bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] flex items-center justify-center mx-auto mb-2 shadow-xs">
                    <Bell className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-[var(--ds-fg)]">
                    {popoverFilter === "unread"
                      ? "Semua notifikasi sudah dibaca"
                      : "Belum ada notifikasi"}
                  </p>
                  <p className="text-xs text-[var(--ds-fg-muted)] mt-1 max-w-[240px]">
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
                  className="divide-y divide-slate-200/70 dark:divide-zinc-800 flex-1"
                >
                  <motion.div variants={listContainerVariants} initial="hidden" animate="show">
                    {displayedNotifications.map((item) => (
                      <NotificationRowItem key={item.id} item={item} variant="popover" onSelect={handleItemClick} />
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer (shrink-0 mt-auto) */}
          <div className="shrink-0 p-2 border-t border-slate-200/70 dark:border-zinc-800 bg-[var(--ds-surface-muted)] flex items-center justify-center">
            <div className="w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  setHistoryOpen(true);
                }}
                className="w-full text-xs font-semibold text-[var(--ds-accent-fg)] hover:bg-[var(--ds-surface)] h-8 rounded-lg cursor-pointer"
              >
                Lihat Semua Riwayat
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* History Dialog with FIXED LOCKED HEIGHT h-[580px] to NEVER shift position */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent data-module="portal" className="max-w-xl sm:max-w-2xl p-0 overflow-hidden rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] shadow-lg h-[580px] max-h-[85vh] flex flex-col">
          {/* Header (shrink-0) */}
          <DialogHeader className="shrink-0 px-6 py-4 border-b border-slate-200/70 dark:border-zinc-800 bg-[var(--ds-surface-muted)]">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold text-[var(--ds-fg)] flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[var(--ds-accent-fg)]" />
                  Riwayat Notifikasi
                </DialogTitle>
                <DialogDescription className="text-xs text-[var(--ds-fg-muted)] mt-1">
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
                    className="text-xs text-[var(--ds-accent-fg)] border-[var(--ds-accent-soft-border)] hover:bg-[var(--ds-accent-soft)] rounded-lg h-8 cursor-pointer"
                  >
                    <CheckCheck className="w-4 h-4 mr-1" />
                    Tandai Semua Dibaca
                  </Button>
                </motion.div>
              )}
            </div>

            {/* Filter Tabs with animated sliding pill */}
            <div className="flex items-center p-1 bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-lg mt-3 w-fit">
              {([
                ["all", "Semua"],
                ["unread", "Belum Dibaca"],
                ["read", "Sudah Dibaca"],
              ] as const).map(([tabKey, tabLabel]) => (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => handleSelectHistoryFilter(tabKey)}
                  className={cn(
                    "relative px-3 py-2 rounded-lg text-xs font-medium transition-colors z-10 flex items-center gap-2 cursor-pointer",
                    historyFilter === tabKey
                      ? "text-[var(--ds-fg)] font-bold"
                      : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
                  )}
                >
                  {historyFilter === tabKey && (
                    <motion.div
                      layoutId="activeHistoryFilterTab"
                      className="absolute inset-0 bg-[var(--ds-accent-soft)] rounded-lg shadow-xs"
                      transition={{ type: "spring", stiffness: 450, damping: 30 }}
                    />
                  )}
                  <span className="relative z-20 flex items-center gap-2">
                    {tabLabel}
                    {tabKey === "unread" && (
                      <AnimatePresence>
                        {unreadCount > 0 && (
                          <motion.span
                            key="history-tab-unread-count"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className={cn(
                              "px-2 py-0 rounded-full text-xs font-bold transition-colors tabular-nums",
                              historyFilter === "unread"
                                ? "bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)]"
                                : "bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]"
                            )}
                          >
                            {unreadCount}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </DialogHeader>

          {/* Body with locked flex-1 & directional slide transition */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 sm:px-4 py-2 relative flex flex-col">
            {/* Subtle top loading indicator bar instead of full-page collapse */}
            {historyLoading && (
              <div className="absolute top-0 inset-x-0 h-1 bg-[var(--ds-accent-soft)] overflow-hidden z-20">
                <motion.div
                  className="h-full bg-[var(--ds-accent-solid)] w-1/3 rounded-full"
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
                  className="h-full min-h-[340px] flex flex-col items-center justify-center text-[var(--ds-fg-muted)] gap-2 my-auto"
                >
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--ds-accent-fg)]" />
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
                  <div className="w-14 h-14 rounded-3xl bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] flex items-center justify-center mx-auto mb-3 shadow-xs">
                    <Bell className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--ds-fg)]">
                    {historyFilter === "unread"
                      ? "Tidak ada notifikasi yang belum dibaca"
                      : historyFilter === "read"
                      ? "Belum ada notifikasi yang sudah dibaca"
                      : "Belum ada riwayat notifikasi"}
                  </p>
                  <p className="text-xs text-[var(--ds-fg-muted)] mt-1 max-w-sm mx-auto">
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
                  className="space-y-2 flex-1"
                >
                  <motion.div variants={listContainerVariants} initial="hidden" animate="show">
                    {historyItems.map((item) => (
                      <NotificationRowItem key={item.id} item={item} variant="history" onSelect={handleItemClick} />
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Stable Fixed Footer (shrink-0 mt-auto) - ALWAYS rendered to lock bottom edge */}
          <div className="shrink-0 h-12 flex items-center justify-between px-6 border-t border-slate-200/70 dark:border-zinc-800 bg-[var(--ds-surface-muted)]">
            <span className="text-xs text-[var(--ds-fg-muted)] tabular-nums">
              {historyTotal > 0
                ? `Halaman ${historyPage} dari ${historyTotalPages} (${historyTotal} item)`
                : `0 item`}
            </span>
            <div className="flex items-center gap-2">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchHistory(historyPage - 1)}
                  disabled={historyPage <= 1 || historyLoading}
                  className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchHistory(historyPage + 1)}
                  disabled={historyPage >= historyTotalPages || historyLoading}
                  className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </motion.div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
