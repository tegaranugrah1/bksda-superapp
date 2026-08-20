import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api/client';
import { ApiError, ApiSuccess } from '@/types/api';
import { withMobileParams } from '@/lib/api/mobileParams';
import { AssetListItem, BmnQueryFilters } from './types';

export function useAssets(filters?: BmnQueryFilters) {
  const [items, setItems] = useState<AssetListItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | undefined>(undefined);

  const prevFilterKeyRef = useRef<string>('');

  const filterKey = JSON.stringify({
    search: filters?.search,
    kondisi: filters?.kondisi,
    jenis_bmn: filters?.jenis_bmn,
    lokasi_ruang: filters?.lokasi_ruang,
    employee_id: filters?.employee_id,
  });

  const loadData = useCallback(async (targetPage: number, mode: 'initial' | 'refresh' | 'next') => {
    if (mode === 'initial') {
      setIsLoading(true);
    } else if (mode === 'refresh') {
      setIsRefreshing(true);
    } else if (mode === 'next') {
      setIsFetchingNextPage(true);
    }
    setError(undefined);

    try {
      const queryParams = withMobileParams({
        page: targetPage,
        search: filters?.search || undefined,
        kondisi: filters?.kondisi || undefined,
        jenis_bmn: filters?.jenis_bmn || undefined,
        lokasi_ruang: filters?.lokasi_ruang || undefined,
        employee_id: filters?.employee_id || undefined,
      });

      const response = await apiClient.get<ApiSuccess<AssetListItem[]>>('/bmn/assets', {
        params: queryParams,
      });

      const rawItems = response.data.data || [];
      const newItems = Array.from(
        new Map(rawItems.map((item) => [String(item.id), item])).values()
      );
      const meta = response.data.meta;

      setItems((prev) => (targetPage === 1 ? newItems : [...prev, ...newItems]));
      setPage(targetPage);

      if (meta && typeof meta.current_page === 'number' && typeof meta.last_page === 'number') {
        setHasNextPage(meta.current_page < meta.last_page);
      } else {
        setHasNextPage(newItems.length >= (queryParams.per_page || 20));
      }
    } catch (err: any) {
      setError(err as ApiError);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsFetchingNextPage(false);
    }
  }, [filters]);

  // Handle filter changes (Reset to page 1)
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
  }, [page, hasNextPage, isFetchingNextPage, isLoading, loadData]);

  const goToPage = useCallback((targetPage: number) => {
    if (targetPage < 1 || isLoading) return;
    loadData(targetPage, 'initial');
  }, [isLoading, loadData]);

  return {
    items,
    isLoading,
    isRefreshing,
    isFetchingNextPage,
    error,
    refetch,
    fetchNextPage,
    goToPage,
    page,
    hasNextPage,
  };
}
