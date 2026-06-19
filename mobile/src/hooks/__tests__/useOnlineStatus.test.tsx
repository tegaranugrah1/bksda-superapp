import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ApiError } from '@/types/api';
import { isNetworkError, OnlineStatus, useOnlineStatus } from '../useOnlineStatus';

describe('useOnlineStatus', () => {
  let capturedStatus!: OnlineStatus;

  function TestComponent({ error }: { error?: ApiError | null }) {
    capturedStatus = useOnlineStatus(error);
    return null;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-19T08:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('detects normalized network errors', () => {
    expect(isNetworkError({ kind: 'network', message: 'Koneksi internet terganggu.' })).toBe(true);
    expect(isNetworkError({ kind: 'server', message: 'Failed to fetch dashboard' })).toBe(true);
    expect(isNetworkError({ kind: 'validation', message: 'Nama wajib diisi' })).toBe(false);
  });

  it('exposes offline state when the observed request error is network related', () => {
    const error: ApiError = {
      kind: 'network',
      message: 'Koneksi internet terganggu.',
    };

    act(() => {
      renderer.create(<TestComponent error={error} />);
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(capturedStatus.isOnline).toBe(false);
    expect(capturedStatus.isOffline).toBe(true);
    expect(capturedStatus.lastNetworkErrorAt).toBe(Date.parse('2026-06-19T08:00:00.000Z'));
  });

  it('can be marked back online after a successful request', () => {
    let tree!: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <TestComponent
          error={{
            kind: 'network',
            message: 'Koneksi internet terganggu.',
          }}
        />
      );
    });

    expect(capturedStatus.isOffline).toBe(true);

    act(() => {
      tree.update(<TestComponent error={null} />);
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(capturedStatus.isOnline).toBe(true);
    expect(capturedStatus.isOffline).toBe(false);
  });
});
