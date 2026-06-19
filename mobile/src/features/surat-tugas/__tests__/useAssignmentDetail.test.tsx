import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { apiClient } from '@/lib/api/client';
import { useAssignmentDetail } from '../useAssignmentDetail';

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

describe('useAssignmentDetail', () => {
  let capturedResult: ReturnType<typeof useAssignmentDetail> | null = null;

  const TestComponent = ({
    id,
    mode,
  }: {
    id?: string | number;
    mode?: 'personal' | 'management';
  }) => {
    capturedResult = useAssignmentDetail(id, mode);
    return null;
  };

  const flushPromises = () => new Promise(jest.requireActual('timers').setImmediate);

  beforeEach(() => {
    jest.clearAllMocks();
    capturedResult = null;
  });

  it('fetches personal assignment detail by default', async () => {
    const detail = {
      id: 'st-1',
      nomor: 'ST.001/BKSDA/2026',
      kegiatan: 'Patroli kawasan',
      personel: [],
      file: { available: true, download_url: '/api/surat-tugas/my/st-1/download' },
      allowed_actions: { can_view: true, can_download: true },
    };

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { data: detail },
    });

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<TestComponent id="st-1" />);
      await flushPromises();
    });

    expect(apiClient.get).toHaveBeenCalledWith('/surat-tugas/my/st-1', {
      params: { mobile: true },
    });
    expect(capturedResult?.data).toEqual(detail);
    expect(capturedResult?.isLoading).toBe(false);
    expect(capturedResult?.isForbidden).toBe(false);
    expect(capturedResult?.isNotFound).toBe(false);

    act(() => {
      tree!.unmount();
    });
  });

  it('fetches management assignment detail when requested', async () => {
    const detail = {
      id: 'st-2',
      nomor: 'ST.002/BKSDA/2026',
      kegiatan: 'Monitoring',
      personel: [],
      file: { available: false },
      allowed_actions: { can_view: true, can_update: true },
    };

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { data: detail },
    });

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<TestComponent id="st-2" mode="management" />);
      await flushPromises();
    });

    expect(apiClient.get).toHaveBeenCalledWith('/surat-tugas/st-2', {
      params: { mobile: true },
    });
    expect(capturedResult?.data).toEqual(detail);

    act(() => {
      tree!.unmount();
    });
  });

  it('exposes forbidden state on 403 error', async () => {
    (apiClient.get as jest.Mock).mockRejectedValue({
      response: {
        status: 403,
        data: { message: 'Anda tidak memiliki akses ke Surat Tugas ini.' },
      },
    });

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<TestComponent id="st-forbidden" />);
      await flushPromises();
    });

    expect(capturedResult?.data).toBeUndefined();
    expect(capturedResult?.isForbidden).toBe(true);
    expect(capturedResult?.isNotFound).toBe(false);
    expect(capturedResult?.error).toEqual(
      expect.objectContaining({
        status: 403,
        kind: 'forbidden',
      })
    );

    act(() => {
      tree!.unmount();
    });
  });

  it('exposes not-found state on 404 error', async () => {
    (apiClient.get as jest.Mock).mockRejectedValue({
      response: {
        status: 404,
        data: { message: 'Data tidak ditemukan.' },
      },
    });

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<TestComponent id="missing" mode="management" />);
      await flushPromises();
    });

    expect(capturedResult?.isForbidden).toBe(false);
    expect(capturedResult?.isNotFound).toBe(true);
    expect(capturedResult?.error).toEqual(
      expect.objectContaining({
        status: 404,
        kind: 'not_found',
      })
    );

    act(() => {
      tree!.unmount();
    });
  });

  it('refetches detail on demand', async () => {
    const detail = {
      id: 'st-1',
      nomor: 'ST.001/BKSDA/2026',
      personel: [],
      file: { available: false },
      allowed_actions: { can_view: true },
    };

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { data: detail },
    });

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<TestComponent id="st-1" />);
      await flushPromises();
    });

    expect(apiClient.get).toHaveBeenCalledTimes(1);

    await act(async () => {
      capturedResult?.refetch();
      await flushPromises();
    });

    expect(apiClient.get).toHaveBeenCalledTimes(2);

    act(() => {
      tree!.unmount();
    });
  });

  it('does not fetch when id is missing', async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<TestComponent />);
      await flushPromises();
    });

    expect(apiClient.get).not.toHaveBeenCalled();
    expect(capturedResult?.isLoading).toBe(false);
    expect(capturedResult?.data).toBeUndefined();

    act(() => {
      tree!.unmount();
    });
  });
});
