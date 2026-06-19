import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { normalizeError } from '@/lib/api/errors';
import { ApiError, ApiSuccess } from '@/types/api';
import { AssignmentDetail, AssignmentListMode } from './types';

export interface UseAssignmentDetailResult {
  data?: AssignmentDetail;
  isLoading: boolean;
  error?: ApiError;
  refetch: () => void;
  isForbidden: boolean;
  isNotFound: boolean;
}

export function useAssignmentDetail(
  id?: string | number,
  mode: AssignmentListMode = 'personal'
): UseAssignmentDetailResult {
  const [data, setData] = useState<AssignmentDetail | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(!!id);
  const [error, setError] = useState<ApiError | undefined>(undefined);

  const loadData = useCallback(async () => {
    if (!id) {
      setData(undefined);
      setError(undefined);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      const endpoint = mode === 'personal' ? `/surat-tugas/my/${id}` : `/surat-tugas/${id}`;
      const response = await apiClient.get<ApiSuccess<AssignmentDetail>>(endpoint, {
        params: { mobile: true },
      });
      setData(response.data.data);
    } catch (err: unknown) {
      setData(undefined);
      setError(normalizeError(err));
    } finally {
      setIsLoading(false);
    }
  }, [id, mode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  return {
    data,
    isLoading,
    error,
    refetch: loadData,
    isForbidden: error?.kind === 'forbidden' || error?.status === 403,
    isNotFound: error?.kind === 'not_found' || error?.status === 404,
  };
}
