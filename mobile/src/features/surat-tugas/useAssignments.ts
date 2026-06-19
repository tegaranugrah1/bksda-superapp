import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { withMobileParams } from '@/lib/api/mobileParams';
import { ApiError, ApiSuccess } from '@/types/api';
import { AssignmentListItem, AssignmentQueryFilters } from './types';

type LoadMode = 'initial' | 'refresh' | 'next';

export interface UseAssignmentsResult {
  items: AssignmentListItem[];
  isLoading: boolean;
  isRefreshing: boolean;
  isFetchingNextPage: boolean;
  error?: ApiError;
  refetch: () => void;
  fetchNextPage: () => void;
  hasNextPage: boolean;
}

export function useAssignments(filters?: AssignmentQueryFilters): UseAssignmentsResult {
  const [items, setItems] = useState<AssignmentListItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | undefined>(undefined);

  const prevFilterKeyRef = useRef<string>('');
  const mode = filters?.mode ?? 'personal';

  const filterKey = JSON.stringify({
    mode,
    search: filters?.search,
    status: filters?.status,
    employee_id: filters?.employee_id,
    per_page: filters?.per_page,
  });

  const loadData = useCallback(
    async (targetPage: number, loadMode: LoadMode) => {
      if (loadMode === 'initial') {
        setIsLoading(true);
      } else if (loadMode === 'refresh') {
        setIsRefreshing(true);
      } else {
        setIsFetchingNextPage(true);
      }
      setError(undefined);

      try {
        const endpoint = mode === 'personal' ? '/surat-tugas/my' : '/surat-tugas';
        const queryParams = withMobileParams({
          page: targetPage,
          per_page: filters?.per_page,
          search: filters?.search || undefined,
          status: filters?.status || undefined,
          employee_id: filters?.employee_id || undefined,
        });

        const response = await apiClient.get<ApiSuccess<AssignmentListItem[]>>(endpoint, {
          params: queryParams,
        });

        const newItems = response.data.data || [];
        const meta = response.data.meta;

        setItems((previousItems) => (targetPage === 1 ? newItems : [...previousItems, ...newItems]));
        setPage(targetPage);

        if (meta && typeof meta.current_page === 'number' && typeof meta.last_page === 'number') {
          setHasNextPage(meta.current_page < meta.last_page);
        } else {
          setHasNextPage(newItems.length >= (queryParams.per_page || 20));
        }
      } catch (err: unknown) {
        setError(err as ApiError);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsFetchingNextPage(false);
      }
    },
    [filters, mode]
  );

  useEffect(() => {
    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      loadData(1, 'initial');
    }
  }, [filterKey, loadData]);

  const refetch = useCallback(() => {
    loadData(1, 'refresh');
  }, [loadData]);

  const fetchNextPage = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage && !isLoading) {
      loadData(page + 1, 'next');
    }
  }, [hasNextPage, isFetchingNextPage, isLoading, loadData, page]);

  return {
    items,
    isLoading,
    isRefreshing,
    isFetchingNextPage,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
  };
}
