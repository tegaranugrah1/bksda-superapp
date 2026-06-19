import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { useAssetDetail } from '../useAssetDetail';
import { apiClient } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

describe('useAssetDetail', () => {
  let capturedResult: any = null;

  const TestComponent = ({ id }: { id: string | number }) => {
    capturedResult = useAssetDetail(id);
    return null;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    capturedResult = null;
  });

  const flushPromises = () => new Promise(jest.requireActual('timers').setImmediate);

  it('fetches asset detail on mount and updates state on success', async () => {
    const mockDetail = {
      id: 1,
      nama_barang: 'Laptop Asus ROG',
      kode_barang: 'BMN-001',
      nup: 5,
      merk_tipe: 'ROG Zephyrus G14',
      kondisi: 'Baik',
      lokasi: 'Seksi Wilayah I',
      is_verified: true,
    };

    let resolvePromise: any;
    const apiPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (apiClient.get as jest.Mock).mockReturnValue(apiPromise);

    let tree: any;
    act(() => {
      tree = renderer.create(<TestComponent id={1} />);
    });

    expect(capturedResult.isLoading).toBe(true);

    await act(async () => {
      resolvePromise({
        data: {
          data: mockDetail,
          message: 'Success',
        },
      });
      await flushPromises();
    });

    expect(apiClient.get).toHaveBeenCalledWith('/bmn/assets/1');

    expect(capturedResult.isLoading).toBe(false);
    expect(capturedResult.data).toEqual(mockDetail);
    expect(capturedResult.error).toBeUndefined();

    act(() => {
      tree.unmount();
    });
  });

  it('sets normalized error on API failure', async () => {
    const mockError = {
      response: {
        status: 404,
        data: {
          message: 'Data tidak ditemukan.',
        },
      },
    };

    (apiClient.get as jest.Mock).mockRejectedValue(mockError);

    let tree: any;
    await act(async () => {
      tree = renderer.create(<TestComponent id={99} />);
      await flushPromises();
    });

    expect(apiClient.get).toHaveBeenCalledWith('/bmn/assets/99');
    expect(capturedResult.isLoading).toBe(false);
    expect(capturedResult.data).toBeUndefined();
    
    // As normalized by apiClient response interceptor
    expect(capturedResult.error).toEqual(expect.objectContaining({
      status: 404,
      message: 'Data tidak ditemukan.',
      kind: 'not_found',
    }));

    act(() => {
      tree.unmount();
    });
  });

  it('refetches data when refetch is called', async () => {
    const mockDetail = { id: 1, nama_barang: 'Laptop' };

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        data: mockDetail,
        message: 'Success',
      },
    });

    let tree: any;
    await act(async () => {
      tree = renderer.create(<TestComponent id={1} />);
      await flushPromises();
    });

    expect(apiClient.get).toHaveBeenCalledTimes(1);

    await act(async () => {
      capturedResult.refetch();
      await flushPromises();
    });

    expect(apiClient.get).toHaveBeenCalledTimes(2);

    act(() => {
      tree.unmount();
    });
  });
});
