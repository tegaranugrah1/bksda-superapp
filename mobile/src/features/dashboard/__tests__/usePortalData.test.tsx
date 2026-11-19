import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { apiClient } from '@/lib/api/client';
import { useForegroundRefresh } from '@/hooks/useForegroundRefresh';
import { useReverbRefresh } from '@/hooks/useReverbRefresh';
import type { Employee } from '@/types/auth';
import { usePortalData } from '../usePortalData';

jest.mock('@/lib/api/client', () => ({ apiClient: { get: jest.fn() } }));
jest.mock('@/hooks/useForegroundRefresh', () => ({ useForegroundRefresh: jest.fn() }));
jest.mock('@/hooks/useReverbRefresh', () => ({ useReverbRefresh: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (effect: () => void) => { jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]); },
}));

const employee: Employee = {
  id: 1, nip: '000000000000000001', name: 'Dummy Employee', position: 'Staff', department: 'Dummy Unit',
  email: null, phone: null, photo: null, rank: null, is_active: true,
};
let model!: ReturnType<typeof usePortalData>;
function Consumer({ person }: { person?: Employee | null }) { model = usePortalData(person); return null; }
const flush = () => new Promise(jest.requireActual('timers').setImmediate);
let tree: renderer.ReactTestRenderer | undefined;
beforeEach(() => {
  jest.clearAllMocks();
  (apiClient.get as jest.Mock).mockImplementation(async (url: string) => {
    const payload = url === '/surat-tugas/my' ? [{ id: 'dummy-letter', status: 'approved' }]
      : url === '/me/leave-requests' ? [{ id: 9, jenis_cuti: 'Cuti Tahunan' }]
      : url.startsWith('/me/leave-balance') ? { sisa_cuti_tersedia: 0 }
      : url === '/me/assets' ? [{ id: 1, nama_barang: 'Dummy assigned asset' }, { id: 2, nama_barang: 'Dummy borrowed asset' }]
      : { my_assets: [{ id: '2', status: 'dipinjam' }] };
    return { data: { data: payload } };
  });
});
afterEach(() => { if (tree) act(() => tree!.unmount()); tree = undefined; });

it('loads the same five endpoints and keeps borrowed assets out of permanent assets', async () => {
  await act(async () => { tree = renderer.create(<Consumer person={employee} />); await flush(); });
  expect((apiClient.get as jest.Mock).mock.calls.map(call => call[0]).sort()).toEqual([
    '/surat-tugas/my', '/me/leave-requests', `/me/leave-balance?year=${new Date().getFullYear()}`, '/me/assets', '/me/dashboard',
  ].sort());
  expect(model.myAssetsList.map(asset => asset.id)).toEqual([1]);
  expect(model.activeLoansList).toHaveLength(1);
  expect(model.leaveBalance.sisa_cuti_tersedia).toBe(0);
  expect(model.myStList).toHaveLength(1);
  await act(async () => { tree!.update(<Consumer person={{ ...employee }} />); await flush(); });
  expect(apiClient.get).toHaveBeenCalledTimes(5);
});

it('uses the same refresh callback for foreground and Reverb and can refresh leave data alone', async () => {
  await act(async () => { tree = renderer.create(<Consumer person={employee} />); await flush(); });
  const realtime = (useReverbRefresh as jest.Mock).mock.calls.at(-1);
  expect(realtime[0]).toEqual(['user']);
  expect(realtime[1]).toBe(model.refreshAllPortalData);
  expect((useForegroundRefresh as jest.Mock).mock.calls.at(-1)[0]).toBe(model.refreshAllPortalData);
  (apiClient.get as jest.Mock).mockClear();
  await act(async () => { realtime[1](); await flush(); });
  expect(apiClient.get).toHaveBeenCalledTimes(5);
  (apiClient.get as jest.Mock).mockClear();
  await act(async () => { await Promise.all([model.fetchMyLeaveRequests(), model.fetchMyLeaveBalance()]); });
  expect((apiClient.get as jest.Mock).mock.calls.map(call => call[0])).toEqual([
    '/me/leave-requests', `/me/leave-balance?year=${new Date().getFullYear()}`,
  ]);
});

it.each([null, { ...employee, nip: 'mmp-001' }])('does not fetch an ineligible leave balance (%p)', async person => {
  await act(async () => { tree = renderer.create(<Consumer person={person} />); await flush(); });
  expect(apiClient.get).toHaveBeenCalledTimes(4);
  expect(model.canFetchLeaveBalance).toBe(false);
  expect(model.leaveBalance).toBeNull();
});

it('preserves the existing failure behavior without inventing assets or leave entitlement', async () => {
  await act(async () => { tree = renderer.create(<Consumer person={employee} />); await flush(); });
  const previousLetters = model.myStList;
  (apiClient.get as jest.Mock).mockRejectedValue(new Error('Dummy network failure'));
  await act(async () => { model.refreshAllPortalData(); await flush(); });
  expect(model.leaveRequests).toEqual([]);
  expect(model.leaveBalance).toBeNull();
  expect(model.myAssetsList).toEqual([]);
  expect(model.activeLoansList).toEqual([]);
  expect(model.myStList).toBe(previousLetters);
});
