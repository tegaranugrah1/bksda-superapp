import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { apiClient } from '@/lib/api/client';
import { useEmployeeSearch } from '../useEmployeeSearch';
import { EmployeeSearchFilters } from '../types';

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

describe('useEmployeeSearch', () => {
  let capturedResult: ReturnType<typeof useEmployeeSearch> | null = null;

  const TestComponent = ({ filters }: { filters?: EmployeeSearchFilters }) => {
    capturedResult = useEmployeeSearch(filters);
    return null;
  };

  const flushPromises = () => new Promise(jest.requireActual('timers').setImmediate);

  beforeEach(() => {
    jest.clearAllMocks();
    capturedResult = null;
  });

  it('searches employees with mobile pagination params', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        data: [
          {
            id: 1,
            nama_lengkap: 'Pegawai Satu',
            nip: '199001012020011001',
            jabatan: 'Polhut',
            satuan_kerja: 'BKSDA Kaltim',
          },
        ],
        meta: { current_page: 1, last_page: 1 },
      },
    });

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<TestComponent filters={{ search: '199001', per_page: 10 }} />);
      await flushPromises();
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/kepegawaian/employees',
      expect.objectContaining({
        params: expect.objectContaining({
          mobile: true,
          page: 1,
          per_page: 10,
          search: '199001',
        }),
      })
    );
    expect(capturedResult?.items).toEqual([
      {
        id: 1,
        name: 'Pegawai Satu',
        nip: '199001012020011001',
        jabatan: 'Polhut',
        unit_kerja: 'BKSDA Kaltim',
      },
    ]);
    expect(capturedResult?.hasNextPage).toBe(false);

    act(() => {
      tree.unmount();
    });
  });

  it('uses per_page 20 by default so it does not fetch all employees', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        data: [],
        meta: { current_page: 1, last_page: 1 },
      },
    });

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<TestComponent />);
      await flushPromises();
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/kepegawaian/employees',
      expect.objectContaining({
        params: expect.objectContaining({
          page: 1,
          per_page: 20,
          mobile: true,
        }),
      })
    );

    act(() => {
      tree.unmount();
    });
  });

  it('appends next page results', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        data: [{ id: 1, name: 'Pegawai Satu' }],
        meta: { current_page: 1, last_page: 2 },
      },
    });

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<TestComponent filters={{ search: 'pegawai' }} />);
      await flushPromises();
    });

    expect(capturedResult?.hasNextPage).toBe(true);

    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        data: [{ id: 2, name: 'Pegawai Dua' }],
        meta: { current_page: 2, last_page: 2 },
      },
    });

    await act(async () => {
      capturedResult?.fetchNextPage();
      await flushPromises();
    });

    expect(apiClient.get).toHaveBeenLastCalledWith(
      '/kepegawaian/employees',
      expect.objectContaining({
        params: expect.objectContaining({ page: 2, per_page: 20, search: 'pegawai' }),
      })
    );
    expect(capturedResult?.items.map((item) => item.name)).toEqual(['Pegawai Satu', 'Pegawai Dua']);
    expect(capturedResult?.hasNextPage).toBe(false);

    act(() => {
      tree.unmount();
    });
  });

  it('captures API errors without clearing previous state shape', async () => {
    const apiError = { kind: 'server', message: 'Server error', status: 500 };
    (apiClient.get as jest.Mock).mockRejectedValue(apiError);

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<TestComponent />);
      await flushPromises();
    });

    expect(capturedResult?.error).toBe(apiError);
    expect(capturedResult?.isLoading).toBe(false);

    act(() => {
      tree.unmount();
    });
  });
});
