import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/types/api';

export type OnlineStatus = {
  isOnline: boolean;
  isOffline: boolean;
  lastNetworkErrorAt: number | null;
  markOnline: () => void;
  markOffline: () => void;
};

export function isNetworkError(error?: Pick<ApiError, 'kind' | 'message'> | null): boolean {
  if (!error) return false;
  if (error.kind === 'network') return true;

  const message = String(error.message || '').toLowerCase();
  return (
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('koneksi') ||
    message.includes('internet') ||
    message.includes('failed to fetch') ||
    message.includes('timeout')
  );
}

export function useOnlineStatus(observedError?: Pick<ApiError, 'kind' | 'message'> | null): OnlineStatus {
  const initialObservedOffline = isNetworkError(observedError);
  const [observedStatus, setObservedStatus] = useState({
    isOffline: initialObservedOffline,
    lastNetworkErrorAt: null as number | null,
  });
  const [manualOnlineStatus, setManualOnlineStatus] = useState<boolean | null>(null);
  const [manualNetworkErrorAt, setManualNetworkErrorAt] = useState<number | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const nextOffline = isNetworkError(observedError);
      setObservedStatus((current) => ({
        isOffline: nextOffline,
        lastNetworkErrorAt: nextOffline
          ? current.lastNetworkErrorAt ?? Date.now()
          : observedError
            ? current.lastNetworkErrorAt
            : null,
      }));
    }, 0);

    return () => clearTimeout(timeout);
  }, [observedError]);

  const isOnline = observedStatus.isOffline ? false : manualOnlineStatus ?? true;

  const markOnline = useCallback(() => {
    setManualOnlineStatus(true);
  }, []);

  const markOffline = useCallback(() => {
    setManualOnlineStatus(false);
    setManualNetworkErrorAt(Date.now());
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    lastNetworkErrorAt: observedStatus.lastNetworkErrorAt ?? manualNetworkErrorAt,
    markOnline,
    markOffline,
  };
}
