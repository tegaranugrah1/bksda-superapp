import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { apiClient } from '@/lib/api/client';
import { useAssignments } from '../useAssignments';
import { AssignmentQueryFilters } from '../types';

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

describe('useAssignments', () => {
  let capturedResult: ReturnType<typeof useAssignments> | null = null;

  const TestComponent = ({ filters }: { filters?: AssignmentQueryFilters }) => {
    capturedResult = useAssignments(filters);
    return null;
  };

  const flushPromises = () => new Promise(jest.requireActual('timers').setImmediate);

  beforeEach(() => {
    jest.clearAllMocks();
    capturedResult = null;
  });

  it('fetches personal assignments by default with mobile params', async () => {
    const mockData = [
      { id: 'st-1', nomor: 'ST.001/BKSDA/2026', kegiatan: 'Patroli' },
    ];

    let resolvePromise: (value: unknown) => void = () => undefined;
    const apiPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (apiClient.get as jest.Mock).mockReturnValue(apiPromise);

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TestComponent />);
    });

    expect(capturedResult?.isLoading).toBe(true);

    await act(async () => {
      resolvePromise({
        data: {
          data: mockData,
          meta: { current_page: 1, last_page: 1 },
        },
      });
      await flushPromises();
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/surat-tugas/my',
      expect.objectContaining({
        params: expect.objectContaining({
          mobile: true,
          page: 1,
          per_page: 20,
        }),
      })
    );
    expect(capturedResult?.items).toEqual(mockData);
    expect(capturedResult?.isLoading).toBe(false);
    expect(capturedResult?.hasNextPage).toBe(false);

    act(() => {
      tree.unmount();
    });
  });

  it('fetches management assignments with search and status filters', async () => {
    const mockData = [{ id: 'st-2', nomor: 'ST.002/BKSDA/2026', status: 'pending' }];

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        data: mockData,
        meta: { current_page: 1, last_page: 1 },
      },
    });

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <TestComponent filters={{ mode: 'management', search: 'patroli', status: 'pending' }} />
      );
      await flushPromises();
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/surat-tugas',
      expect.objectContaining({
        params: expect.objectContaining({
          search: 'patroli',
          status: 'pending',
          page: 1,
        }),
      })
    );
    expect(capturedResult?.items).toEqual(mockData);

    act(() => {
      tree.unmount();
    });
  });

  it('appends next page results when fetchNextPage is called', async () => {
    const pageOne = [{ id: 'st-1', nomor: 'ST.001/BKSDA/2026' }];
    const pageTwo = [{ id: 'st-2', nomor: 'ST.002/BKSDA/2026' }];

    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        data: pageOne,
        meta: { current_page: 1, last_page: 2 },
      },
    });

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<TestComponent filters={{ mode: 'management' }} />);
      await flushPromises();
    });

    expect(capturedResult?.hasNextPage).toBe(true);

    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        data: pageTwo,
        meta: { current_page: 2, last_page: 2 },
      },
    });

    await act(async () => {
      capturedResult?.fetchNextPage();
      await flushPromises();
    });

    expect(apiClient.get).toHaveBeenLastCalledWith(
      '/surat-tugas',
      expect.objectContaining({
        params: expect.objectContaining({ page: 2 }),
      })
    );
    expect(capturedResult?.items).toEqual([...pageOne, ...pageTwo]);
    expect(capturedResult?.hasNextPage).toBe(false);

    act(() => {
      tree.unmount();
    });
  });

  it('sets refreshing state during manual refetch', async () => {
    const mockData = [{ id: 'st-1', nomor: 'ST.001/BKSDA/2026' }];

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        data: mockData,
        meta: { current_page: 1, last_page: 1 },
      },
    });

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<TestComponent />);
      await flushPromises();
    });

    let resolveRefetch: (value: unknown) => void = () => undefined;
    const refetchPromise = new Promise((resolve) => {
      resolveRefetch = resolve;
    });
    (apiClient.get as jest.Mock).mockReturnValue(refetchPromise);

    act(() => {
      capturedResult?.refetch();
    });

    expect(capturedResult?.isRefreshing).toBe(true);

    await act(async () => {
      resolveRefetch({
        data: {
          data: mockData,
          meta: { current_page: 1, last_page: 1 },
        },
      });
      await flushPromises();
    });

    expect(capturedResult?.isRefreshing).toBe(false);

    act(() => {
      tree.unmount();
    });
  });
});
