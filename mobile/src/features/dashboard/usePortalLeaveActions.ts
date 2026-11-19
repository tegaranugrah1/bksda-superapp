import React, { useState } from "react";
import { Alert, Platform } from "react-native";
import { apiClient } from "@/lib/api/client";
import type { LeaveRequestPrintData } from "@/components/FormulirCutiPrintModal";
import type { PortalLeaveScanState } from "./portalViewTypes";
import type { usePortalData } from "./usePortalData";

function base64DataUrlToBlobUrl(dataUrl: string): string | null {
  try {
    if (typeof atob !== "function" || typeof URL === "undefined" || typeof Blob === "undefined") {
      return null;
    }
    const parts = dataUrl.split(",");
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "application/pdf";
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch {
    return null;
  }
}

/** Keep leave actions mounted with the portal so tab changes preserve their state. */
export function usePortalLeaveActions({
  fetchMyLeaveRequests, fetchMyLeaveBalance,
}: Pick<ReturnType<typeof usePortalData>, "fetchMyLeaveRequests" | "fetchMyLeaveBalance">) {
  const [cutiPreviewItem, setCutiPreviewItem] = useState<LeaveRequestPrintData | null>(null);
  const [cutiPreviewVisible, setCutiPreviewVisible] = useState(false);
  const [cancelLeaveTarget, setCancelLeaveTarget] = useState<any>(null);
  const [isCancellingLeave, setIsCancellingLeave] = useState(false);
  const [leaveScanModal, setLeaveScanModal] = useState<PortalLeaveScanState>({ visible: false, title: "", loading: false });

  const scanRequestId = React.useRef(0);
  const scanBlobUrl = React.useRef<string | null>(null);
  const releaseScanBlob = React.useCallback(() => {
    if (scanBlobUrl.current && typeof URL !== "undefined") URL.revokeObjectURL(scanBlobUrl.current);
    scanBlobUrl.current = null;
  }, []);

  React.useEffect(() => () => {
    scanRequestId.current++;
    releaseScanBlob();
  }, [releaseScanBlob]);

  const closeLeaveScanModal = React.useCallback(() => {
    scanRequestId.current++;
    releaseScanBlob();
    setLeaveScanModal({ visible: false, title: "", loading: false });
  }, [releaseScanBlob]);

  const handleOpenLeaveScan = React.useCallback(async (req: any, kind: "surat_izin" | "formulir") => {
    const requestId = ++scanRequestId.current;
    releaseScanBlob();
    const isSuratIzin = kind === "surat_izin";
    const fileName = isSuratIzin
      ? (req.scan_surat_izin_nama || req.scan_surat_nama || "Surat_Izin_Cuti.pdf")
      : (req.scan_formulir_nama || "Formulir_Cuti.pdf");
    const title = isSuratIzin
      ? "Surat Izin Cuti Resmi (TTE Kepala Balai)"
      : "Scan Formulir Permohonan Cuti (TTD & Cap Balai)";

    const endpoint = `/me/leave-requests/${req.id}/${isSuratIzin ? "scan-surat-izin" : "scan-formulir"}`;
    setLeaveScanModal({ visible: true, title, fileName, loading: true });
    try {
      const response = await apiClient.get<any>(endpoint, { params: { preview: 1 } });
      if (requestId !== scanRequestId.current) return;
      const dataUrl = response.data?.data_url || response.data?.data?.data_url;
      if (typeof dataUrl !== "string" || !/^data:(application\/pdf|image\/(png|jpeg|webp));base64,[A-Za-z0-9+/=\r\n]+$/.test(dataUrl)) {
        throw new Error("Format berkas scan tidak didukung.");
      }
      const serverName = response.data?.file_name || response.data?.data?.file_name || fileName;
      const mimeType = String(response.data?.mime_type || response.data?.data?.mime_type || "application/pdf");
      const blobUrl =
        Platform.OS === "web" && typeof dataUrl === "string" && dataUrl.startsWith("data:")
          ? base64DataUrlToBlobUrl(dataUrl)
          : null;

      scanBlobUrl.current = blobUrl;
      setLeaveScanModal({
        visible: true,
        title,
        fileName: serverName,
        mimeType,
        dataUrl: dataUrl || null,
        blobUrl,
        loading: false,
      });
    } catch (err: any) {
      if (requestId !== scanRequestId.current) return;
      const msg = err?.message || "Berkas scan belum diunggah atau tidak ditemukan.";
      setLeaveScanModal({
        visible: true,
        title,
        fileName,
        loading: false,
        error: msg,
      });
    }
  }, [releaseScanBlob]);

  const handleConfirmCancelLeave = React.useCallback(async () => {
    if (!cancelLeaveTarget) return;
    setIsCancellingLeave(true);
    try {
      await apiClient.delete(`/me/leave-requests/${cancelLeaveTarget.id}`);
      setCancelLeaveTarget(null);
      fetchMyLeaveRequests();
      fetchMyLeaveBalance();
    } catch (err: any) {
      const msg = err?.message || "Gagal membatalkan permohonan cuti.";
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(msg);
      } else {
        Alert.alert("Gagal", msg);
      }
    } finally {
      setIsCancellingLeave(false);
    }
  }, [cancelLeaveTarget, fetchMyLeaveRequests, fetchMyLeaveBalance]);

  return {
    cutiPreviewItem, setCutiPreviewItem, cutiPreviewVisible, setCutiPreviewVisible,
    cancelLeaveTarget, setCancelLeaveTarget, isCancellingLeave,
    leaveScanModal, closeLeaveScanModal, handleOpenLeaveScan, handleConfirmCancelLeave,
  };
}
