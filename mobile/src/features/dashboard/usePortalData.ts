import React, { useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { apiClient } from "@/lib/api/client";
import { useForegroundRefresh } from "@/hooks/useForegroundRefresh";
import { useReverbRefresh } from "@/hooks/useReverbRefresh";
import type { Employee } from "@/types/auth";
import type { PratinjauSuratTugasItem } from "@/components/PratinjauSuratTugasModal";
import type { LeaveRequestPrintData } from "@/components/FormulirCutiPrintModal";

/** Personal portal data stays mounted across tabs; refreshing does not reset UI state. */
export function usePortalData(employee?: Employee | null) {
  const [myStList, setMyStList] = useState<PratinjauSuratTugasItem[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestPrintData[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);

  // 1. Employee Leave Requests (GET /me/leave-requests)
  const fetchMyLeaveRequests = React.useCallback(async () => {
    try {
      const response = await apiClient.get<any>("/me/leave-requests");
      const list = Array.isArray(response.data?.data) ? response.data.data : response.data || [];
      setLeaveRequests(list);
    } catch {
      setLeaveRequests([]);
    }
  }, []);

  // 2. Employee Leave Balance (GET /me/leave-balance)
  const canFetchLeaveBalance = !!employee &&
    !employee?.nip?.toUpperCase().startsWith("MMP-");
  const fetchMyLeaveBalance = React.useCallback(async () => {
    if (!canFetchLeaveBalance) {
      setLeaveBalance(null);
      return;
    }
    try {
      const year = new Date().getFullYear();
      const response = await apiClient.get<any>(`/me/leave-balance?year=${year}`);
      const data = response.data?.data || response.data || {};
      setLeaveBalance(data);
    } catch {
      setLeaveBalance(null);
    }
  }, [canFetchLeaveBalance]);

  // 3. Employee Assigned Assets (GET /me/assets - correct endpoint for personal BMN)
  const [assignedAssetsList, setAssignedAssetsList] = useState<any[]>([]);

  const fetchMyAssets = React.useCallback(async () => {
    try {
      const response = await apiClient.get<any>("/me/assets");
      const list = Array.isArray(response.data?.data) ? response.data.data : response.data || [];
      setAssignedAssetsList(list);
    } catch {
      setAssignedAssetsList([]);
    }
  }, []);

  // 4. Employee Active Loans (GET /me/dashboard -> my_assets)
  const [activeLoansList, setActiveLoansList] = useState<any[]>([]);
  // Match the web portal: a currently borrowed asset belongs only in the loan list.
  const myAssetsList = React.useMemo(() => {
    const borrowedIds = new Set(activeLoansList.map((loan) => String(loan.id)));
    return assignedAssetsList.filter((asset) => !borrowedIds.has(String(asset.id)));
  }, [assignedAssetsList, activeLoansList]);
  const [loanCheckNowTs, setLoanCheckNowTs] = useState(() => Date.now());

  const fetchActiveLoans = React.useCallback(async () => {
    setLoanCheckNowTs(Date.now());
    try {
      const response = await apiClient.get<any>("/me/dashboard");
      const raw = response.data?.data || response.data || {};
      const loans = Array.isArray(raw.my_assets) ? raw.my_assets : [];
      setActiveLoansList(loans);
    } catch {
      setActiveLoansList([]);
    }
  }, []);

  // 5. Employee Surat Tugas (GET /surat-tugas/my)
  const fetchMySt = React.useCallback(async () => {
    try {
      const response = await apiClient.get<any>("/surat-tugas/my");
      if (response.data && Array.isArray(response.data.data)) {
        setMyStList(response.data.data);
      }
    } catch {}
  }, []);

  const refreshAllPortalData = React.useCallback(() => {
    fetchMySt();
    fetchMyLeaveRequests();
    fetchMyLeaveBalance();
    fetchMyAssets();
    fetchActiveLoans();
  }, [fetchMySt, fetchMyLeaveRequests, fetchMyLeaveBalance, fetchMyAssets, fetchActiveLoans]);

  useFocusEffect(
    React.useCallback(() => {
      refreshAllPortalData();
    }, [refreshAllPortalData])
  );

  useForegroundRefresh(refreshAllPortalData);
  useReverbRefresh(["user"], refreshAllPortalData);

  return {
    myStList, leaveRequests, leaveBalance, canFetchLeaveBalance,
    myAssetsList, activeLoansList, loanCheckNowTs,
    fetchMyLeaveRequests, fetchMyLeaveBalance, refreshAllPortalData,
  };
}
