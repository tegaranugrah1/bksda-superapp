import React from 'react';
import { AppState, AppStateStatus } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { useForegroundRefresh } from '../useForegroundRefresh';

describe('useForegroundRefresh', () => {
  let appStateHandler: ((state: AppStateStatus) => void) | undefined;
  let removeListener: jest.Mock;
  let currentState: AppStateStatus;

  function TestComponent({
    enabled = true,
    refetch,
    staleMs = 60_000,
  }: {
    enabled?: boolean;
    refetch: () => void;
    staleMs?: number;
  }) {
    useForegroundRefresh(refetch, { enabled, staleMs });
    return null;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-19T08:00:00.000Z'));
    currentState = 'active';
    appStateHandler = undefined;
    removeListener = jest.fn();

    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => currentState,
    });

    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
      appStateHandler = handler;
      return { remove: removeListener };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('refetches when the app returns to foreground after stale threshold', () => {
    const refetch = jest.fn();

    act(() => {
      renderer.create(<TestComponent refetch={refetch} staleMs={1_000} />);
    });

    act(() => {
      appStateHandler?.('background');
    });

    jest.setSystemTime(new Date('2026-06-19T08:00:02.000Z'));

    act(() => {
      appStateHandler?.('active');
    });

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('does not refetch when foreground resume is not stale yet', () => {
    const refetch = jest.fn();

    act(() => {
      renderer.create(<TestComponent refetch={refetch} staleMs={60_000} />);
    });

    act(() => {
      appStateHandler?.('inactive');
    });

    jest.setSystemTime(new Date('2026-06-19T08:00:10.000Z'));

    act(() => {
      appStateHandler?.('active');
    });

    expect(refetch).not.toHaveBeenCalled();
  });

  it('does not subscribe when disabled and removes listener on unmount', () => {
    const refetch = jest.fn();
    let tree!: renderer.ReactTestRenderer;

    (AppState.addEventListener as jest.Mock).mockClear();

    act(() => {
      tree = renderer.create(<TestComponent refetch={refetch} enabled={false} />);
    });

    expect(AppState.addEventListener).not.toHaveBeenCalled();

    act(() => {
      tree.update(<TestComponent refetch={refetch} enabled />);
    });

    expect(AppState.addEventListener).toHaveBeenCalledTimes(1);

    act(() => {
      tree.unmount();
    });

    expect(removeListener).toHaveBeenCalledTimes(1);
  });
});
