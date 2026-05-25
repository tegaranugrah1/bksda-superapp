"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import type { AssetResponse, AuctionAsset } from "../_lib/auction-helpers";

export interface UseAuctionAssetsResult {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  page: number;
  setPage: (value: number | ((prev: number) => number)) => void;
  perPage: number;
  setPerPage: (value: number) => void;
  orderedIds: string[];
  setOrderedIds: React.Dispatch<React.SetStateAction<string[]>>;
  response: AssetResponse | undefined;
  isLoading: boolean;
  isFetching: boolean;
  assets: AuctionAsset[];
  selectedIds: Set<string>;
  orderedSelectedAssets: AuctionAsset[];
  selectedTotal: number;
  allSelected: boolean;
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  moveUp: (index: number) => void;
  moveDown: (index: number) => void;
  handleDragStart: (index: number) => void;
  handleDragEnter: (index: number) => void;
  handleDragEnd: () => void;
}

export function useAuctionAssets(): UseAuctionAssetsResult {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const debouncedSearch = useDebounce(searchTerm, 400);

  const dragIndexRef = useRef<number | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);

  const { data: response, isLoading, isFetching } = useQuery<AssetResponse>({
    queryKey: ["bmn-auction-candidates", debouncedSearch, page, perPage],
    queryFn: async () => {
      const res = await api.get("/bmn/assets", {
        params: {
          kondisi: "Rusak Berat",
          search: debouncedSearch || undefined,
          page,
          per_page: perPage === 0 ? 9999 : perPage,
        },
      });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });

  const assets = useMemo(() => response?.data || [], [response?.data]);
  const selectedIds = useMemo(() => new Set(orderedIds), [orderedIds]);

  const assetMap = useMemo(() => {
    const map = new Map<string, AuctionAsset>();
    assets.forEach((a) => map.set(a.id, a));
    return map;
  }, [assets]);

  const orderedSelectedAssets = useMemo(
    () => orderedIds.flatMap((id) => (assetMap.has(id) ? [assetMap.get(id)!] : [])),
    [orderedIds, assetMap]
  );

  const selectedTotal = orderedSelectedAssets.reduce(
    (total, asset) => total + (asset.nilai_perolehan || 0),
    0
  );
  const allSelected = assets.length > 0 && assets.every((asset) => selectedIds.has(asset.id));

  const toggleSelect = useCallback((id: string) => {
    setOrderedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setOrderedIds([]);
      return;
    }
    setOrderedIds((prev) => {
      const existing = new Set(prev);
      const newIds = assets.filter((a) => !existing.has(a.id)).map((a) => a.id);
      return [...prev, ...newIds];
    });
  }, [allSelected, assets]);

  const moveUp = useCallback((index: number) => {
    if (index === 0) return;
    setOrderedIds((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((index: number) => {
    setOrderedIds((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const handleDragStart = useCallback((index: number) => {
    dragIndexRef.current = index;
  }, []);

  const handleDragEnter = useCallback((index: number) => {
    dragOverIndexRef.current = index;
  }, []);

  const handleDragEnd = useCallback(() => {
    const from = dragIndexRef.current;
    const to = dragOverIndexRef.current;
    if (from === null || to === null || from === to) {
      dragIndexRef.current = null;
      dragOverIndexRef.current = null;
      return;
    }
    setOrderedIds((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    dragIndexRef.current = null;
    dragOverIndexRef.current = null;
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    page,
    setPage,
    perPage,
    setPerPage,
    orderedIds,
    setOrderedIds,
    response,
    isLoading,
    isFetching,
    assets,
    selectedIds,
    orderedSelectedAssets,
    selectedTotal,
    allSelected,
    toggleSelect,
    toggleSelectAll,
    moveUp,
    moveDown,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
  };
}
