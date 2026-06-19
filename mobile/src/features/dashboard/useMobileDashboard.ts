import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { ApiError, ApiSuccess } from '@/types/api';
import { DashboardData } from './types';

export function useMobileDashboard() {
  const [data, setData] = useState<DashboardData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | undefined>(undefined);

  const fetchDashboard = useCallback(async (isRefetch = false) => {
    if (isRefetch) {
      setIsLoading(true);
    }
    setError(undefined);
    try {
      const response = await apiClient.get<ApiSuccess<DashboardData>>('/mobile/dashboard');
      setData(response.data.data);
    } catch (err: any) {
      setError(err as ApiError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    data,
    isLoading,
    error,
    refetch: () => fetchDashboard(true),
  };
}
