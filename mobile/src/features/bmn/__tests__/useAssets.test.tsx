import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { useAssets } from '../useAssets';
import { apiClient } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

describe('useAssets', () => {
  let capturedResult: any = null;

  const TestComponent = ({ filters }: any) => {
    capturedResult = useAssets(filters);
    return null;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    capturedResult = null;
  });

  const flushPromises = () => new Promise(jest.requireActual('timers').setImmediate);

  it('fetches assets on mount and updates state on success', async () => {
    const mockDataPage1 = [
      { id: 1, nama_barang: 'Aset 1', kode_barang: 'K-01' },
      { id: 2, nama_barang: 'Aset 2', kode_barang: 'K-02' },
    ];

    let resolvePromise: any;
    const apiPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (apiClient.get as jest.Mock).mockReturnValue(apiPromise);

    let tree: any;
    act(() => {
      tree = renderer.create(<TestComponent filters={{}} />);
    });

    expect(capturedResult.isLoading).toBe(true);

    await act(async () => {
      resolvePromise({
        data: {
          data: mockDataPage1,
          meta: { current_page: 1, last_page: 2 },
          message: 'Success',
        },
      });
      await flushPromises();
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/bmn/assets',
      expect.objectContaining({
        params: expect.objectContaining({
          mobile: true,
          page: 1,
          per_page: 20,
        }),
      })
    );

    expect(capturedResult.isLoading).toBe(false);
    expect(capturedResult.items).toEqual(mockDataPage1);
    expect(capturedResult.hasNextPage).toBe(true);
    expect(capturedResult.error).toBeUndefined();

    act(() => {
      tree.unmount();
    });
  });

  it('resets page to 1 and fetches new data when filters change', async () => {
    const mockDataFilters = [
      { id: 3, nama_barang: 'Aset Saring', kode_barang: 'K-03' },
    ];

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        data: mockDataFilters,
        meta: { current_page: 1, last_page: 1 },
        message: 'Success',
      },
    });

    let tree: any;
    await act(async () => {
      tree = renderer.create(<TestComponent filters={{ search: '' }} />);
      await flushPromises();
    });

    expect(apiClient.get).toHaveBeenCalledTimes(1);

    // Update filters
    await act(async () => {
      tree.update(<TestComponent filters={{ search: 'Saring' }} />);
      await flushPromises();
    });

    expect(apiClient.get).toHaveBeenCalledTimes(2);
    expect(apiClient.get).toHaveBeenLastCalledWith(
      '/bmn/assets',
      expect.objectContaining({
        params: expect.objectContaining({
          search: 'Saring',
          page: 1,
        }),
      })
    );

    expect(capturedResult.items).toEqual(mockDataFilters);
    expect(capturedResult.hasNextPage).toBe(false);

    act(() => {
      tree.unmount();
    });
  });

  it('fetches page 2 and appends items when fetchNextPage is called', async () => {
    const mockDataPage1 = [{ id: 1, nama_barang: 'Aset 1' }];
    const mockDataPage2 = [{ id: 2, nama_barang: 'Aset 2' }];

    // Mock first call
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        data: mockDataPage1,
        meta: { current_page: 1, last_page: 2 },
        message: 'Success',
      },
    });

    let tree: any;
    await act(async () => {
      tree = renderer.create(<TestComponent filters={{}} />);
      await flushPromises();
    });

    expect(capturedResult.items).toEqual(mockDataPage1);
    expect(capturedResult.hasNextPage).toBe(true);

    // Mock page 2 response
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        data: mockDataPage2,
        meta: { current_page: 2, last_page: 2 },
        message: 'Success',
      },
    });

    // Call fetchNextPage
    await act(async () => {
      capturedResult.fetchNextPage();
      await flushPromises();
    });

    expect(apiClient.get).toHaveBeenCalledTimes(2);
    expect(apiClient.get).toHaveBeenLastCalledWith(
      '/bmn/assets',
      expect.objectContaining({
        params: expect.objectContaining({
          page: 2,
        }),
      })
    );

    expect(capturedResult.items).toEqual([...mockDataPage1, ...mockDataPage2]);
    expect(capturedResult.hasNextPage).toBe(false);

    act(() => {
      tree.unmount();
    });
  });

  it('sets isRefreshing during manual refetch', async () => {
    const mockData = [{ id: 1, nama_barang: 'Aset 1' }];

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        data: mockData,
        meta: { current_page: 1, last_page: 1 },
        message: 'Success',
      },
    });

    let tree: any;
    await act(async () => {
      tree = renderer.create(<TestComponent filters={{}} />);
      await flushPromises();
    });

    let resolveRefetchPromise: any;
    const refetchPromise = new Promise((resolve) => {
      resolveRefetchPromise = resolve;
    });

    (apiClient.get as jest.Mock).mockReturnValue(refetchPromise);

    // Trigger manual refetch
    act(() => {
      capturedResult.refetch();
    });

    expect(capturedResult.isRefreshing).toBe(true);

    await act(async () => {
      resolveRefetchPromise({
        data: {
          data: mockData,
          meta: { current_page: 1, last_page: 1 },
          message: 'Success',
        },
      });
      await flushPromises();
    });

    expect(capturedResult.isRefreshing).toBe(false);

    act(() => {
      tree.unmount();
    });
  });
});
