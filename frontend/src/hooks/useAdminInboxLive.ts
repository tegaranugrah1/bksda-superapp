"use client";

import { useEffect, useRef } from "react";
import { getEcho } from "@/lib/echo";

export interface AdminInboxEventData {
  module: string;
  action: string;
  reference_id?: string | null;
  timestamp?: string;
}

/**
 * Hook untuk berlangganan pembaruan inbox admin secara real-time via WebSocket.
 * Channel: private-admin.inbox.{module}
 * Modul: 'surat_tugas' | 'kepegawaian' | 'bmn'
 *
 * Mengikuti prinsip ponytail:
 * - Minimal, reusable di seluruh halaman admin
 * - Fallback aman: jika Reverb offline atau token kosong, UI tetap normal tanpa error
 * - Payload minimal (hanya ID & status), UI memicu refetch resmi via REST
 */
export function useAdminInboxLive(
  module: "surat_tugas" | "kepegawaian" | "bmn",
  onChanged: (data: AdminInboxEventData) => void
): void {
  const callbackRef = useRef(onChanged);
  callbackRef.current = onChanged;

  useEffect(() => {
    const echo = getEcho();
    if (!echo) return;

    const channelName = `admin.inbox.${module}`;
    const channel = echo.private(channelName);

    const handleEvent = (data: AdminInboxEventData) => {
      callbackRef.current(data);
    };

    channel.listen(".inbox.changed", handleEvent);

    return () => {
      try {
        echo.leave(channelName);
      } catch {
        // Fallback cleanup
      }
    };
  }, [module]);
}
