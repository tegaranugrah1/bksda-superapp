import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { withMobileParams } from '@/lib/api/mobileParams';
import { ApiError, ApiSuccess } from '@/types/api';
import { EmployeeSearchFilters, EmployeeSelectorItem } from './types';

type LoadMode = 'initial' | 'refresh' | 'next';

type EmployeeApiItem = {
  id: string | number;
  name?: string | null;
  nama_lengkap?: string | null;
  nip?: string | null;
  jabatan?: string | null;
  position?: string | null;
  satuan_kerja?: string | null;
  department?: string | null;
  unit_kerja?: string | null;
};

export interface UseEmployeeSearchResult {
  items: EmployeeSelectorItem[];
  isLoading: boolean;
  isRefreshing: boolean;
  isFetchingNextPage: boolean;
  error?: ApiError;
  refetch: () => void;
  fetchNextPage: () => void;
  hasNextPage: boolean;
}

function normalizeEmployee(item: EmployeeApiItem): EmployeeSelectorItem {
  return {
    id: item.id,
    name: item.name || item.nama_lengkap || '-',
    nip: item.nip ?? null,
    jabatan: item.jabatan || item.position || null,
    unit_kerja: item.unit_kerja || item.satuan_kerja || item.department || null,
  };
}

export function useEmployeeSearch(filters?: EmployeeSearchFilters): UseEmployeeSearchResult {
  const [items, setItems] = useState<EmployeeSelectorItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | undefined>(undefined);

  const prevFilterKeyRef = useRef<string>('');
  const search = filters?.search;
  const perPage = filters?.per_page ?? 20;
  const filterKey = JSON.stringify({
    search,
    per_page: perPage,
  });

  const loadData = useCallback(
    async (targetPage: number, mode: LoadMode) => {
      if (mode === 'initial') {
        setIsLoading(true);
      } else if (mode === 'refresh') {
        setIsRefreshing(true);
      } else {
        setIsFetchingNextPage(true);
      }
      setError(undefined);

      try {
        const queryParams = withMobileParams({
          page: targetPage,
          per_page: perPage,
          search: search || undefined,
        });

        const response = await apiClient.get<ApiSuccess<EmployeeApiItem[]>>('/kepegawaian/employees', {
          params: queryParams,
        });

        const newItems = (response.data.data || []).map(normalizeEmployee);
        const meta = response.data.meta;

        setItems((previousItems) => (targetPage === 1 ? newItems : [...previousItems, ...newItems]));
        setPage(targetPage);

        if (meta && typeof meta.current_page === 'number' && typeof meta.last_page === 'number') {
          setHasNextPage(meta.current_page < meta.last_page);
        } else {
          setHasNextPage(newItems.length >= perPage);
        }
      } catch (err: unknown) {
        setError(err as ApiError);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsFetchingNextPage(false);
      }
    },
    [search, perPage]
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
