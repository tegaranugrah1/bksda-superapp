import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { useMobileDashboard } from '../useMobileDashboard';
import { apiClient } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

describe('useMobileDashboard', () => {
  let capturedResult: any = null;

  const TestComponent = () => {
    capturedResult = useMobileDashboard();
    return null;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    capturedResult = null;
  });

  const flushPromises = () => new Promise(jest.requireActual('timers').setImmediate);

  it('fetches dashboard data on mount and updates state on success', async () => {
    const mockDashboardData = {
      profile: { id: 1, name: 'Test User' },
      summary: { assigned_assets_count: 5 },
      urgent_tax_vehicles: [],
      notifications: [],
    };

    let resolvePromise: any;
    const apiPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (apiClient.get as jest.Mock).mockReturnValue(apiPromise);

    let tree: any;
    act(() => {
      tree = renderer.create(<TestComponent />);
    });

    // Check loading state (still loading because promise has not resolved)
    expect(capturedResult.isLoading).toBe(true);

    // Now resolve the promise
    await act(async () => {
      resolvePromise({
        data: {
          data: mockDashboardData,
          message: 'Success',
        },
      });
      await flushPromises();
    });

    expect(apiClient.get).toHaveBeenCalledWith('/mobile/dashboard');
    expect(capturedResult.isLoading).toBe(false);
    expect(capturedResult.data).toEqual(mockDashboardData);
    expect(capturedResult.error).toBeUndefined();

    act(() => {
      tree.unmount();
    });
  });

  it('sets error state when API request fails', async () => {
    const mockError = {
      status: 500,
      message: 'Server error',
      kind: 'server',
    };

    (apiClient.get as jest.Mock).mockRejectedValue(mockError);

    let tree: any;
    await act(async () => {
      tree = renderer.create(<TestComponent />);
    });

    await act(async () => {
      await flushPromises();
    });

    expect(apiClient.get).toHaveBeenCalledWith('/mobile/dashboard');
    expect(capturedResult.isLoading).toBe(false);
    expect(capturedResult.data).toBeUndefined();
    expect(capturedResult.error).toEqual(mockError);

    act(() => {
      tree.unmount();
    });
  });

  it('refetches data when refetch is called', async () => {
    const mockDashboardData = {
      profile: { id: 1, name: 'Test User' },
      summary: { assigned_assets_count: 5 },
      urgent_tax_vehicles: [],
      notifications: [],
    };

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        data: mockDashboardData,
        message: 'Success',
      },
    });

    let tree: any;
    await act(async () => {
      tree = renderer.create(<TestComponent />);
    });

    await act(async () => {
      await flushPromises();
    });

    expect(apiClient.get).toHaveBeenCalledTimes(1);

    // Call refetch
    await act(async () => {
      capturedResult.refetch();
    });

    await act(async () => {
      await flushPromises();
    });

    expect(apiClient.get).toHaveBeenCalledTimes(2);

    act(() => {
      tree.unmount();
    });
  });
});
