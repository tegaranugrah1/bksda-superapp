import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { ApiError, ApiSuccess } from '@/types/api';
import { normalizeError } from '@/lib/api/errors';
import { AssetDetail } from './types';

export function useAssetDetail(id: string | number) {
  const [data, setData] = useState<AssetDetail | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | undefined>(undefined);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const response = await apiClient.get<ApiSuccess<AssetDetail>>(`/bmn/assets/${id}`);
      setData(response.data.data);
    } catch (err: any) {
      setError(normalizeError(err));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  return {
    data,
    isLoading,
    error,
    refetch: loadData,
  };
}
