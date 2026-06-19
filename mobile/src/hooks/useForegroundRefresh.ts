import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export type ForegroundRefreshOptions = {
  enabled?: boolean;
  staleMs?: number;
};

const DEFAULT_STALE_MS = 60_000;

function isBackgroundState(state: AppStateStatus) {
  return state === 'background' || state === 'inactive';
}

export function useForegroundRefresh(
  refetch: () => void,
  { enabled = true, staleMs = DEFAULT_STALE_MS }: ForegroundRefreshOptions = {}
) {
  useEffect(() => {
    if (!enabled) return undefined;

    let previousState = AppState.currentState;
    let backgroundedAt: number | null = null;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (isBackgroundState(nextState)) {
        backgroundedAt = Date.now();
      }

      if (nextState === 'active' && isBackgroundState(previousState) && backgroundedAt !== null) {
        const elapsedMs = Date.now() - backgroundedAt;

        if (elapsedMs >= staleMs) {
          refetch();
        }

        backgroundedAt = null;
      }

      previousState = nextState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [enabled, refetch, staleMs]);
}
